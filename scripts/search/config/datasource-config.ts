export function getDataSourceConfig(
  dataSourceName: string,
  resourceId: string,
  containerName: string,
) {
  return {
    name: dataSourceName,
    description: undefined,
    type: 'azureblob' as 'azureblob',
    credentials: {
      connectionString: `ResourceId=${resourceId};`,
    },
    container: {
      name: containerName,
      query: undefined,
    },
    identity: undefined,
  };
}
