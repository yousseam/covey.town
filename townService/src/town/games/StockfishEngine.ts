import { spawn, ChildProcessWithoutNullStreams } from "child_process";

export default class StockfishEngine {
  private _child: ChildProcessWithoutNullStreams;
  private _buffer = "";
  private _queue: Array<() => Promise<any>> = [];
  private _busy = false;

  constructor(binaryPath: string) {
    this._child = spawn(binaryPath, [], { stdio: "pipe" });

    this._child.stdout.on("data", (data: Buffer) => {
      this._buffer += data.toString();
      this._process();
    });

    this._child.stdin.write("uci\n");
  }

  private _write(cmd: string) {
    this._child.stdin.write(cmd + "\n");
  }

  private _process() {
    // split on newlines, keep incomplete in buffer
    const lines = this._buffer.split("\n");
    this._buffer = lines.pop() ?? "";

    for (const line of lines) {
      this._handleLine(line.trim());
    }
  }

  private _pendingResolvers: Array<(line: string) => boolean> = [];

  private _handleLine(line: string) {
    // let any pending resolver process this line
    for (const resolver of [...this._pendingResolvers]) {
      if (resolver(line)) {
        // resolver consumed it, remove
        this._pendingResolvers.splice(
          this._pendingResolvers.indexOf(resolver),
          1
        );
        break;
      }
    }
  }

  private _waitForLine(match: (l: string) => boolean): Promise<string> {
    return new Promise((resolve) => {
      this._pendingResolvers.push((line) => {
        if (match(line)) {
          resolve(line);
          return true;
        }
        return false;
      });
    });
  }

  // ensures sequences happen one at a time
  private en_queue<T>(job: () => Promise<T>): Promise<T> {
    return new Promise<T>((resolve, reject) => {
      this._queue.push(async () => {
        try {
          const result = await job();
          resolve(result);
        } catch (e) {
          reject(e);
        } finally {
          this._busy = false;
          this._dequeue(); // run next job
        }
      });
      this._dequeue();
    });
  }

  private _dequeue() {
    if (this._busy) return;
    const job = this._queue.shift();
    if (!job) return;
    this._busy = true;
    job();
  }

  // ensures _child is synchronized
  private async waitReady(): Promise<void> {
    this._write("isready");
    await this._waitForLine((l) => l === "readyok");
  }

  async getBestMove(fen: string, depth: number): Promise<string> {
    return this.en_queue(async () => {
      await this.waitReady();

      this._write(`position fen ${fen}`);
      this._write(`go depth ${depth}`);

      const bestMoveLine = await this._waitForLine(l => l.startsWith("bestmove"));

      const parts = bestMoveLine.split(" ");
      return parts[1]; // bestmove <move> ponder <move>
    });
  }

  quit() {
    this._write("quit");
    this._child.kill();
  }
}
