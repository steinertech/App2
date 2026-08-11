export interface GridColumn<T> {
  key: keyof T;
  label: string;
}

interface GridProps<T> {
  columns: GridColumn<T>[];
  rows: T[];
}

export default function Grid<T extends object>({ columns, rows }: GridProps<T>) {
  return (
    <table style={{ borderCollapse: 'collapse', fontFamily: 'sans-serif' }}>
      <thead>
        <tr>
          {columns.map((column) => (
            <th
              key={String(column.key)}
              style={{ border: '1px solid #ccc', padding: '8px', textAlign: 'left' }}
            >
              {column.label}
            </th>
          ))}
        </tr>
      </thead>
      <tbody>
        {rows.map((row, index) => (
          <tr key={index}>
            {columns.map((column) => (
              <td key={String(column.key)} style={{ border: '1px solid #ccc', padding: '8px' }}>
                {String(row[column.key] ?? '')}
              </td>
            ))}
          </tr>
        ))}
      </tbody>
    </table>
  );
}
