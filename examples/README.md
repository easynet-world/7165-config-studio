# Config Studio Examples

This folder contains example configuration files demonstrating Config Studio's multi-system management capabilities.

## Supported Formats

Currently, Config Studio supports **properties-based formats** (`.env`, `.properties`) with structured editing. Other formats (YAML, JSON, XML, TOML) are shown in raw editing mode and will be supported in future releases.

## Example Systems

### Properties-based Formats (Structured Editing)
- **api-gateway** - API Gateway configuration (`.env`)
- **database-service** - Database service configuration (`.properties`)
- **frontend-app** - Frontend application configuration (`.env`)
- **web-app** - Web application configuration (`.env`)

### Other Formats (Raw Editing Mode)
- **microservice-api** - Microservice API configuration (`.yaml`) - YAML format
- **mobile-app** - Mobile application configuration (`.json`) - JSON format
- **enterprise-service** - Enterprise service configuration (`.xml`) - XML format
- **cloud-service** - Cloud service configuration (`.toml`) - TOML format

## Usage

These examples are registered automatically when you start Config Studio. You can:

1. **View them in the tab interface** - Each system appears as a tab at the top
2. **Switch between systems** - Click any tab to view and edit that system's configuration
3. **Edit configurations** - 
   - Properties-based formats (`.env`, `.properties`) support structured editing with sections and tabs
   - Other formats (YAML, JSON, XML, TOML) are shown in raw editing mode where you can edit the entire file content
4. **See format support** - Notice how different formats are handled:
   - Supported formats show structured editing with sections
   - Unsupported formats show a raw text editor with a badge indicator

## Notes

- These are **example/demo files only** - they won't affect your actual applications
- The files are in the `examples/` directory which is ignored by git (see `.gitignore`)
- You can delete or modify these examples as needed
- To add your own systems, use the "Manage Systems" button in Config Studio
- Unsupported formats (YAML, JSON, XML, TOML) will be fully supported in future releases

## File Structure

```
examples/
├── api-gateway/
│   └── .env
├── database-service/
│   └── config.properties
├── frontend-app/
│   └── .env
├── web-app/
│   └── .env
├── microservice-api/
│   └── config.yaml
├── mobile-app/
│   └── config.json
├── enterprise-service/
│   └── config.xml
├── cloud-service/
│   └── config.toml
└── README.md
```

