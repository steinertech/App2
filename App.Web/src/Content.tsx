import { useState } from 'react';
import { apiFetch, useEffectOnce } from './util/util-main.ts';
import Grid from './Grid.tsx';
import { GridStoreProvider, useGridStore } from './GridStore.tsx';
import { CONTENT_FORM_CUSTOM_BAND_NAME, CONTENT_FORM_CUSTOM_COLUMN_COUNT, CONTENT_FORM_CUSTOM_ROW_COUNT, CONTENT_FORM_CUSTOM_TABLE_NAME, CONTENT_FORM_PLANE_NAME, CONTENT_TABLE_CUSTOM_TABLE_NAME, CONTENT_TABLE_PLANE_NAME, ContentBandEnum, DESIGN_BAND_PROPERTY_NAMES } from '../../App.Server/dto/shared/content-dto.ts';
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

/**
 * Form layout: a grid of rowCount rows by columnCount columns (named A, B, C, ...), each cell the FieldName property of that cell of band bandName ("Cell" if empty);
 * the server parses and clamps the counts. Its bar (New, Save, Reload, pager) pages the DynamicDto rows of tableName, loaded by the server only. Must be inside its own GridStoreProvider.
 */
function ContentForm({ bandName, rowCount, columnCount, tableName }: { bandName: string; rowCount: string; columnCount: string; tableName: string }) {
  const { load } = useGridStore();

  useEffectOnce(() => {
    void load(CONTENT_FORM_PLANE_NAME, [
      { state: { custom: { [CONTENT_FORM_CUSTOM_BAND_NAME]: bandName, [CONTENT_FORM_CUSTOM_ROW_COUNT]: rowCount, [CONTENT_FORM_CUSTOM_COLUMN_COUNT]: columnCount, [CONTENT_FORM_CUSTOM_TABLE_NAME]: tableName } } },
    ]);
  }, [load, bandName, rowCount, columnCount, tableName]);

  return <Grid path={[0]} />;
}

/** Loads the content named contentName from /api/content and renders every band: Header as h1 (property Text), Table as Data grid of its TableName, Form as RowCount x ColumnCount grid, others as their ContentBandEnum (as number). */
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
              <GridStoreProvider key={index}>
                <ContentForm bandName={band.name} rowCount={propertyValue(band, 'RowCount')} columnCount={propertyValue(band, 'ColumnCount')} tableName={propertyValue(band, 'TableName')} />
              </GridStoreProvider>
            );
          default:
            return <div key={index}>{band.bandEnum}</div>;
        }
      })}
    </div>
  );
}
