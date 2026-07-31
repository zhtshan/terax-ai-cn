type PerfMetric = {
  name: string;
  duration: number;
  timestamp: number;
};

const metrics: PerfMetric[] = [];
const marks = new Map<string, number>();

export const perfMonitor = {
  mark(name: string) {
    marks.set(name, performance.now());
  },

  measure(
    name: string,
    startMark: string,
    endMark: string = startMark,
  ): number | null {
    const start = marks.get(startMark);
    const end = marks.get(endMark);

    if (start === undefined || end === undefined) {
      console.warn(`Missing mark: ${startMark} or ${endMark}`);
      return null;
    }

    const duration = end - start;
    const metric = { name, duration, timestamp: Date.now() };
    metrics.push(metric);

    if (duration > 16) {
      console.warn(
        `🐌 ${name}: ${duration.toFixed(2)}ms (exceeds 16ms frame budget)`,
      );
    } else if (duration > 5) {
      console.log(`⚠️  ${name}: ${duration.toFixed(2)}ms`);
    }

    return duration;
  },

  getMetrics() {
    return metrics.slice();
  },

  printReport() {
    if (metrics.length === 0) {
      console.log("No metrics recorded");
      return;
    }

    const grouped = new Map<string, number[]>();
    metrics.forEach(({ name, duration }) => {
      if (!grouped.has(name)) grouped.set(name, []);
      grouped.get(name)!.push(duration);
    });

    console.group("📊 Performance Report");
    grouped.forEach((durations, name) => {
      const avg = durations.reduce((a, b) => a + b, 0) / durations.length;
      const max = Math.max(...durations);
      const min = Math.min(...durations);
      console.log(
        `${name}: avg=${avg.toFixed(2)}ms, min=${min.toFixed(2)}ms, max=${max.toFixed(2)}ms, count=${durations.length}`,
      );
    });
    console.groupEnd();
  },

  clear() {
    metrics.length = 0;
    marks.clear();
  },
};

if (typeof window !== "undefined") {
  (window as any).__perfMonitor = perfMonitor;
}
