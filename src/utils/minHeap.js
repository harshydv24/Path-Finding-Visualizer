/**
 * MinHeap (Priority Queue)
 * 
 * Binary min-heap implementation optimized for pathfinding algorithms.
 * Elements are ordered by priority (lowest first), which corresponds to:
 * - A*: f(n) = g(n) + h(n)
 * - Dijkstra: g(n) (cumulative cost)
 * 
 * Time complexity:
 * - push: O(log n)
 * - pop:  O(log n)
 * - peek: O(1)
 * 
 * This is critical for A* performance — using a sorted array would be O(n)
 * per insertion, making the algorithm O(n²) instead of O(n log n).
 */
export class MinHeap {
  constructor() {
    this.heap = []; // Array of { value, priority }
  }

  get size() {
    return this.heap.length;
  }

  isEmpty() {
    return this.heap.length === 0;
  }

  /**
   * Insert an element with a given priority.
   * @param {*} value - The element (typically a node ID)
   * @param {number} priority - The priority value (lower = higher priority)
   */
  push(value, priority) {
    this.heap.push({ value, priority });
    this._bubbleUp(this.heap.length - 1);
  }

  /**
   * Remove and return the element with the lowest priority.
   * @returns {*} The value of the element with lowest priority
   */
  pop() {
    if (this.isEmpty()) return null;

    const min = this.heap[0];
    const last = this.heap.pop();

    if (this.heap.length > 0) {
      this.heap[0] = last;
      this._sinkDown(0);
    }

    return min.value;
  }

  /**
   * Peek at the element with the lowest priority without removing it.
   * @returns {{ value: *, priority: number } | null}
   */
  peek() {
    return this.heap.length > 0 ? this.heap[0] : null;
  }

  /** Bubble an element up to restore heap property */
  _bubbleUp(idx) {
    while (idx > 0) {
      const parentIdx = (idx - 1) >> 1;
      if (this.heap[parentIdx].priority <= this.heap[idx].priority) break;
      [this.heap[parentIdx], this.heap[idx]] = [this.heap[idx], this.heap[parentIdx]];
      idx = parentIdx;
    }
  }

  /** Sink an element down to restore heap property */
  _sinkDown(idx) {
    const length = this.heap.length;
    while (true) {
      let smallest = idx;
      const left = 2 * idx + 1;
      const right = 2 * idx + 2;

      if (left < length && this.heap[left].priority < this.heap[smallest].priority) {
        smallest = left;
      }
      if (right < length && this.heap[right].priority < this.heap[smallest].priority) {
        smallest = right;
      }

      if (smallest === idx) break;

      [this.heap[smallest], this.heap[idx]] = [this.heap[idx], this.heap[smallest]];
      idx = smallest;
    }
  }
}
