import { DefaultAzureCredential } from '@azure/identity';
import { LogsIngestionClient } from '@azure/monitor-ingestion';

export class AzureMonitorLoggingService {
  private client: LogsIngestionClient;
  private ruleId: string;
  private streamName: string;

  constructor(
    logsIngestionEndpoint: string,
    ruleId: string,
    streamName: string,
  ) {
    const credential = new DefaultAzureCredential();
    this.client = new LogsIngestionClient(logsIngestionEndpoint, credential);
    this.ruleId = ruleId;
    this.streamName = streamName;
  }

  async log(data: Record<string, any>) {
    try {
      const logEntry = {
        TimeGenerated: new Date().toISOString(),
        ...data,
      };
      console.log('Attempting to send log entry:', logEntry);
      console.log('Using Data Collection Rule ID:', this.ruleId);
      console.log('Using Stream Name:', this.streamName);

      await this.client.upload(this.ruleId, this.streamName, [logEntry]);
      console.log('Log entry sent successfully');
    } catch (error) {
      console.error('Error sending log entry:', error);
      if (error instanceof Error) {
        console.error('Error name:', error.name);
        console.error('Error message:', error.message);
        console.error('Error stack:', error.stack);
      }
    }
  }
}
