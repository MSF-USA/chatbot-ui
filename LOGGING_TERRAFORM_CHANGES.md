# Azure Monitor Logging - Terraform Changes Required

## Summary

The logging infrastructure is already defined in terraform but commented out. We need to:

1. Uncomment the logging module in `compute/main.tf`
2. Add environment variables to container apps
3. Ensure logging works with updated schema

## Files to Modify in `ai-assistant-terraform` Repo

### 1. `terraform/root_modules/compute/main.tf`

**Line 123-159**: Uncomment the logging module

```terraform
# Monitoring - Updated schema for full user profile data
module "logging" {
  source = "../../modules/azurerm-logging"

  endpoint_name                        = "dce-${local.env.prefix}-${local.env.app_name}-${local.env.name}"
  location                             = local.env.location
  resource_group_name                  = local.env.azurerm_resource_group_name
  log_analytics_workspace_id           = data.terraform_remote_state.core.outputs.log_analytics_workspace_id
  log_analytics_workspace_workspace_id = data.terraform_remote_state.core.outputs.log_analytics_workspace_workspace_id
  monitoring_users                     = local.openai_users

  data_collection_rules = [
    {
      name        = "aiplatform"
      stream_name = "Custom-aiplatform_CL"
      columns = [
        { name = "EventType", type = "string" },
        { name = "Status", type = "string" },
        { name = "ModelUsed", type = "string" },
        { name = "MessageCount", type = "int" },
        { name = "Temperature", type = "real" },
        { name = "UserId", type = "string" },
        { name = "UserDisplayName", type = "string" },
        { name = "UserEmail", type = "string" },
        { name = "UserJobTitle", type = "string" },       # NEW
        { name = "UserGivenName", type = "string" },      # NEW
        { name = "UserSurName", type = "string" },        # NEW
        { name = "UserDepartment", type = "string" },     # NEW
        { name = "UserCompanyName", type = "string" },    # NEW
        { name = "BotId", type = "string" },
        { name = "Env", type = "string" },
        { name = "Duration", type = "int" },
        { name = "FileUpload", type = "boolean" },
        { name = "FileName", type = "string" },
        { name = "FileSize", type = "int" },
        { name = "ChunkCount", type = "int" },
        { name = "ProcessedChunkCount", type = "int" },
        { name = "FailedChunkCount", type = "int" },
        { name = "StreamMode", type = "boolean" },
        { name = "ResultCount", type = "int" },
        { name = "OldestDate", type = "string" },
        { name = "NewestDate", type = "string" },
        { name = "ErrorMessage", type = "string" },
        { name = "ErrorStack", type = "string" },
        { name = "StatusCode", type = "int" },
        { name = "TimeGenerated", type = "datetime" }
      ]
      destinations = ["workspace-custom-id"]
    }
  ]

  tags = local.tags
}

# Grant container app identity access to logging
resource "azurerm_role_assignment" "container_app_to_logging" {
  principal_id         = azurerm_user_assigned_identity.container_apps.principal_id
  role_definition_name = "Monitoring Metrics Publisher"
  scope                = module.logging.logs_ingestion_endpoint_id
}
```

### 2. `terraform/root_modules/compute/container_apps.tf`

Add these environment variables to **all three container apps** (dev, live, beta):

**For dev app** (after line 147):

```terraform
      env {
        name  = "LOGS_INJESTION_ENDPOINT"
        value = module.logging.logs_ingestion_endpoint
      }
      env {
        name  = "DATA_COLLECTION_RULE_ID"
        value = module.logging.data_collection_rule_immutable_id["aiplatform"]
      }
      env {
        name  = "STREAM_NAME"
        value = "Custom-aiplatform_CL"
      }
```

**For live app** (after line 384):

```terraform
      env {
        name  = "LOGS_INJESTION_ENDPOINT"
        value = module.logging.logs_ingestion_endpoint
      }
      env {
        name  = "DATA_COLLECTION_RULE_ID"
        value = module.logging.data_collection_rule_immutable_id["aiplatform"]
      }
      env {
        name  = "STREAM_NAME"
        value = "Custom-aiplatform_CL"
      }
```

**For beta app** (after line 621):

```terraform
      env {
        name  = "LOGS_INJESTION_ENDPOINT"
        value = module.logging.logs_ingestion_endpoint
      }
      env {
        name  = "DATA_COLLECTION_RULE_ID"
        value = module.logging.data_collection_rule_immutable_id["aiplatform"]
      }
      env {
        name  = "STREAM_NAME"
        value = "Custom-aiplatform_CL"
      }
```

### 3. `terraform/modules/azurerm-logging/outputs.tf`

Add the endpoint ID output (if not already present):

```terraform
output "logs_ingestion_endpoint_id" {
  description = "Resource ID of the data collection endpoint"
  value       = azurerm_monitor_data_collection_endpoint.main.id
}
```

## Deployment Steps

1. Navigate to terraform repo: `cd ~/Documents/GitHub/ai-assistant-terraform`
2. Make the changes above
3. Plan terraform: `terraform plan` (for your environment)
4. Apply changes: `terraform apply`
5. Verify outputs are available:
   ```bash
   terraform output
   ```

## What This Fixes

- ✅ Adds `LOGS_INJESTION_ENDPOINT` environment variable
- ✅ Adds `DATA_COLLECTION_RULE_ID` environment variable
- ✅ Adds `STREAM_NAME` environment variable
- ✅ Enables Azure Monitor logging with full user profile data
- ✅ Grants container app identity permission to publish metrics

## Known Issue: Azure AI Foundry Endpoint

The `AZURE_AI_FOUNDRY_ENDPOINT` env var may not be set correctly. The error logs show:

```
https://ts-aiassist-dev.cognitiveservices.azure.com/threads
```

But it should be:

```
https://ts-aiassist-dev.services.ai.azure.com/api/projects/default
```

**Current terraform** (line 41-43):

```terraform
env {
  name  = "AZURE_AI_FOUNDRY_ENDPOINT"
  value = replace(data.azurerm_cognitive_account.ai_foundry.endpoint, ".openai.azure.com/", ".services.ai.azure.com/api/projects/default")
}
```

**Problem**: `data.azurerm_cognitive_account.ai_foundry.endpoint` might be returning `.cognitiveservices.azure.com`, not `.openai.azure.com`, so the `replace()` doesn't work.

**Fix**: Hardcode the correct endpoint or use a different data source for AI Foundry projects:

```terraform
env {
  name  = "AZURE_AI_FOUNDRY_ENDPOINT"
  value = "https://ts-aiassist-dev.services.ai.azure.com/api/projects/default"
}
```

Or find the proper way to get the AI Foundry project endpoint from the data source.

## Schema Updates

The data collection rule now includes the NEW user profile fields:

- `UserJobTitle`
- `UserGivenName`
- `UserSurName`
- `UserDepartment`
- `UserCompanyName`

These match the fields we're now storing in the session (from the auth.ts changes in the app repo).
