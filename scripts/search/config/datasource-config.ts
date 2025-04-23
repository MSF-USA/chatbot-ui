export function getDataSourceConfig(
  dataSourceName: string,
  resourceId: string,
  containerName: string,
) {
  return {
    name: dataSourceName,
    description: 'Data source for msf comms articles',
    type: 'azureblob' as 'azureblob',
    credentials: {
      connectionString: `ResourceId=${resourceId}`,
    },
    container: {
      name: containerName,
    },
  };
}
