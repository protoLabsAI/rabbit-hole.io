# Data Table Components

Enterprise-grade data tables built on TanStack Table with theme-aware styling following the whitelabel strategy.

## Components

### DataTable

Core reusable data table component with:

- **TanStack Table Foundation** - Battle-tested React table logic
- **Sorting** - Click column headers to sort ascending/descending
- **Filtering** - Built-in search input for any column
- **Pagination** - Automatic pagination with page controls
- **Column Visibility** - Show/hide columns via dropdown
- **Row Selection** - Track selected rows
- **Theme Integration** - Uses CSS variables from whitelabel system
- **Empty States** - Graceful handling per `empty-result-handling` rule

## Usage

```tsx
import { DataTable, createSortableHeader } from "@/components/data/DataTable";
import { ColumnDef } from "@tanstack/react-table";

// Define your data type
interface MyData {
  id: string;
  name: string;
  status: string;
}

// Define columns
const columns: ColumnDef<MyData>[] = [
  {
    accessorKey: "name",
    header: createSortableHeader("Name"),
  },
  {
    accessorKey: "status",
    header: "Status",
    cell: ({ row }) => (
      <Badge variant="outline">{row.getValue("status")}</Badge>
    ),
  },
];

// Render table
<DataTable
  columns={columns}
  data={myData}
  searchKey="name"
  searchPlaceholder="Search by name..."
  onRowClick={(row) => console.log("Clicked:", row)}
  emptyMessage="No data found."
/>;
```

## Whitelabel Theme Integration

The DataTable uses semantic color tokens from the theme system:

- `text-foreground` - Primary text
- `text-muted-foreground` - Secondary text
- `bg-muted/50` - Hover states
- `border` - Table borders
- `bg-primary/10` - Badge backgrounds
- `bg-success/20`, `bg-warning/20`, etc. - Status badges

All colors automatically adapt when themes change.

## Stories

### EntityDataTable

Demonstrates entity data from the knowledge graph:

- Person entities (Donald Trump, Bernie Sanders, Elon Musk)
- Organization entities (InfoWars, Tesla)
- Movement entities (QAnon, MAGA)
- Media entities (Alice in Wonderland)
- Framework/Database entities (Next.js, Neo4j)

**Stories:**

- Default - All entities
- WithRowClick - Interactive rows
- EmptyState - No data handling
- PersonEntitiesOnly - Filtered by type
- OrganizationsOnly - Filtered by type
- HistoricalEntities - Filtered by status

### FileManagementTable

Demonstrates file management with `FileEntity` types from `@protolabsai/types`:

- Processing state badges (processed, processing, queued, failed)
- File type icons (PDF, images, video, audio, CSV, JSON)
- File size formatting
- Access level indicators
- Action buttons (download, view, delete)

**Stories:**

- FileTableDefault - All files
- ProcessedFilesOnly - Filtered by state
- FailedFiles - Error troubleshooting
- PendingProcessing - Queue monitoring
- ImagesOnly - Filtered by media type
- DocumentsOnly - Filtered by media type
- LargeFilesOnly - Size filtering
- PublicAccessFiles - Access level filtering
- EmptyFileState - No files uploaded

## Type Safety

Both stories use actual types:

- **EntityDataTable**: Based on `BaseEntity` from `@protolabsai/types`
- **FileManagementTable**: Based on `FileEntity` from `@protolabsai/types`
- **FileProcessingState**: Enum from `@protolabsai/types/file-schemas`

## Theme Testing

Test the table across all themes in Storybook:

1. Start Storybook: `pnpm storybook`
2. Navigate to Components/Data/EntityDataTable or FileManagementTable
3. Use toolbar controls to switch themes:
   - Default
   - Corporate Blue
   - Nature Green
   - Dev Environment
   - Production Environment
4. Toggle light/dark mode
5. Verify all colors adapt correctly

## Performance

The DataTable component is optimized for large datasets:

- Virtual scrolling ready (add virtualization library if needed)
- Memoized column definitions
- Efficient filtering and sorting
- Pagination to limit rendered rows

## Accessibility

- Keyboard navigation support
- Screen reader announcements for sorting
- Proper table semantics
- Focus management
- High contrast theme support
