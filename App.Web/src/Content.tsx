import { useState } from 'react';
import { apiFetch, useEffectOnce } from './util/util-main.ts';
import Grid from './Grid.tsx';
import { GridStoreProvider, useGridStore } from './GridStore.tsx';
import { CONTENT_TABLE_CUSTOM_TABLE_NAME, CONTENT_TABLE_PLANE_NAME, ContentBandEnum, DESIGN_BAND_PROPERTY_NAMES } from '../../App.Server/dto/shared/content-dto.ts';
import type { ContentBandDto, ContentDto, ContentRequestDto } from '../../App.Server/dto/shared/content-dto.ts';

/** propertyValue of band's property propertyName (one of DESIGN_BAND_PROPERTY_NAMES[band.bandEnum]); '' if not found. */
function propertyValue(band: ContentBandDto, propertyName: string): string {
  const index = (DESIGN_BAND_PROPERTY_NAMES[band.bandEnum] ?? []).indexOf(propertyName);
  return band.propertyValues[index] ?? '';
}

/** Data grid (like the one titled "Data" on the Dynamic page) with the rows of tableName. Must be inside its own GridStoreProvider (one plane per store). */
function ContentTable({ tableName }: { tableName: string }) {
  const { load } = useGridStore();

  useEffectOnce(() => {
    void load(CONTENT_TABLE_PLANE_NAME, [{ state: { custom: { [CONTENT_TABLE_CUSTOM_TABLE_NAME]: tableName } } }]);
  }, [load, tableName]);

  return <Grid path={[0]} />;
}

/** Max RowCount and ColumnCount rendered by ContentForm, so a large value doesn't render a huge table. */
const CONTENT_FORM_COUNT_MAX = 50;

/** Whole number of a RowCount or ColumnCount propertyValue, clamped to 0..CONTENT_FORM_COUNT_MAX; '' or invalid is 0. */
function contentFormCount(text: string): number {
  const count = Math.trunc(Number(text));
  return Number.isFinite(count) ? Math.min(Math.max(count, 0), CONTENT_FORM_COUNT_MAX) : 0;
}

/** Form layout: a table of rowCount rows by columnCount columns of empty cells. Renders nothing if either is 0. */
function ContentForm({ rowCount, columnCount }: { rowCount: number; columnCount: number }) {
  if (rowCount === 0 || columnCount === 0) {
    return null;
  }
  return (
    <table className="my-2 border-collapse">
      <tbody>
        {Array.from({ length: rowCount }, (_, rowIndex) => (
          <tr key={rowIndex}>
            {Array.from({ length: columnCount }, (_, columnIndex) => (
              <td key={columnIndex} className="h-8 w-32 border border-gray-300" />
            ))}
          </tr>
        ))}
      </tbody>
    </table>
  );
}

/** Loads the content named contentName from /api/content and renders every band: Header as h1 (property Text), Table as Data grid of its TableName, Form as RowCount x ColumnCount table followed by Data grid of its TableName, others as their ContentBandEnum (as number). */
export default function Content({ contentName }: { contentName: string }) {
  const [content, setContent] = useState<ContentDto>();

  // The server redirects to the Sign In page if the user isn't signed in (or the session expired).
  useEffectOnce(() => {
    (async () => {
      const body: ContentRequestDto = { contentName };
      const data = await apiFetch<ContentDto>('content', body);
      // Error (e.g. not signed in): apiFetch already shows the alert.
      if (data !== undefined) {
        setContent(data);
      }
    })().catch(() => {
      // No response; apiFetch already added an Error alert.
    });
  }, [contentName]);

  return (
    <div>
      {content?.bands.map((band, index) => {
        switch (band.bandEnum) {
          case ContentBandEnum.Header:
            return <h1 key={index}>{propertyValue(band, 'Text')}</h1>;
          case ContentBandEnum.Table:
            // Own store per band, so several grids (and the page's grids of the Layout store) don't share one plane.
            return (
              <GridStoreProvider key={index}>
                <ContentTable tableName={propertyValue(band, 'TableName')} />
              </GridStoreProvider>
            );
          case ContentBandEnum.Form:
            return (
              <div key={index}>
                <ContentForm rowCount={contentFormCount(propertyValue(band, 'RowCount'))} columnCount={contentFormCount(propertyValue(band, 'ColumnCount'))} />
                <GridStoreProvider>
                  <ContentTable tableName={propertyValue(band, 'TableName')} />
                </GridStoreProvider>
              </div>
            );
          default:
            return <div key={index}>{band.bandEnum}</div>;
        }
      })}
    </div>
  );
}
