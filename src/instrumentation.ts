export async function register() {
  if (process.env.NEXT_RUNTIME !== 'nodejs') {
    return;
  }
  if (process.env.OTEL_DISABLED === '1' || process.env.VITEST) {
    return;
  }
  const { TracerProvider, SimpleSpanProcessor, ConsoleSpanExporter } = await import(
    '@opentelemetry/sdk-trace'
  );
  const { resourceFromAttributes } = await import('@opentelemetry/resources');
  const { trace } = await import('@opentelemetry/api');
  const provider = new TracerProvider({
    resource: resourceFromAttributes({ 'service.name': 'feedback-inbox' }),
    spanProcessors: [new SimpleSpanProcessor({ exporter: new ConsoleSpanExporter() })],
  });
  trace.setGlobalTracerProvider(provider);
}
