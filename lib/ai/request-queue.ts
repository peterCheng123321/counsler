/**
 * Request queue to prevent overwhelming the AI backend
 * Implements rate limiting and concurrent request management
 */

interface QueuedRequest {
  id: string;
  execute: () => Promise<any>;
  resolve: (value: any) => void;
  reject: (error: any) => void;
  timestamp: number;
}

class RequestQueue {
  private queue: QueuedRequest[] = [];
  private activeRequests: number = 0;
  private readonly MAX_CONCURRENT = 3; // Max 3 concurrent AI requests
  private readonly MAX_QUEUE_SIZE = 10; // Max 10 waiting requests
  private processing: boolean = false;

  /**
   * Add a request to the queue
   */
  async enqueue<T>(execute: () => Promise<T>): Promise<T> {
    // Check if queue is full
    if (this.queue.length >= this.MAX_QUEUE_SIZE) {
      throw new Error("Request queue is full. Please try again later.");
    }

    const requestId = `req_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;

    return new Promise<T>((resolve, reject) => {
      const request: QueuedRequest = {
        id: requestId,
        execute,
        resolve,
        reject,
        timestamp: Date.now(),
      };

      this.queue.push(request);
      console.log(
        `[Request Queue] Queued request ${requestId} (queue size: ${this.queue.length}, active: ${this.activeRequests})`
      );

      // Start processing if not already
      if (!this.processing) {
        this.processQueue();
      }
    });
  }

  /**
   * Process queued requests
   */
  private async processQueue() {
    if (this.processing) return;
    this.processing = true;

    while (this.queue.length > 0 || this.activeRequests > 0) {
      // Process requests up to MAX_CONCURRENT
      while (
        this.queue.length > 0 &&
        this.activeRequests < this.MAX_CONCURRENT
      ) {
        const request = this.queue.shift();
        if (!request) break;

        this.activeRequests++;
        console.log(
          `[Request Queue] Processing request ${request.id} (active: ${this.activeRequests}, waiting: ${this.queue.length})`
        );

        // Execute request asynchronously
        this.executeRequest(request).finally(() => {
          this.activeRequests--;
        });
      }

      // Wait a bit before checking again
      await new Promise((resolve) => setTimeout(resolve, 100));
    }

    this.processing = false;
    console.log("[Request Queue] Queue processing complete");
  }

  /**
   * Execute a single request
   */
  private async executeRequest(request: QueuedRequest) {
    try {
      const start = Date.now();
      const result = await request.execute();
      const duration = Date.now() - start;

      console.log(
        `[Request Queue] Request ${request.id} completed in ${duration}ms`
      );

      request.resolve(result);
    } catch (error) {
      console.error(
        `[Request Queue] Request ${request.id} failed:`,
        error instanceof Error ? error.message : error
      );
      request.reject(error);
    }
  }

  /**
   * Get queue stats
   */
  getStats(): {
    queueSize: number;
    activeRequests: number;
    maxConcurrent: number;
    maxQueueSize: number;
  } {
    return {
      queueSize: this.queue.length,
      activeRequests: this.activeRequests,
      maxConcurrent: this.MAX_CONCURRENT,
      maxQueueSize: this.MAX_QUEUE_SIZE,
    };
  }

  /**
   * Clear the queue (for emergency situations)
   */
  clear() {
    // Reject all pending requests
    for (const request of this.queue) {
      request.reject(new Error("Queue was cleared"));
    }

    this.queue = [];
    console.log("[Request Queue] Queue cleared");
  }
}

// Export singleton instance
export const requestQueue = new RequestQueue();
