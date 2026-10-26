import { useState } from 'react';
import { apiFetch, useEffectOnce } from './util/util-main.ts';
import Grid from './Grid.tsx';
import { GridStoreProvider, useGridStore } from './GridStore.tsx';
import { CONTENT_VIEW_CUSTOM_BAND_NAME, CONTENT_VIEW_PLANE_NAME, ContentBandEnum, contentBandPropertyValue } from '../../App.Server/dto/shared/content-dto.ts';
import type { ContentBandDto, ContentDto, ContentRequestDto } from '../../App.Server/dto/shared/content-dto.ts';

/** Returns true if band is shown as a grid of the CONTENT_VIEW_PLANE_NAME plane (a Table or Form band). */
function isGridBand(band: ContentBandDto): boolean {
  return band.bandEnum === ContentBandEnum.Table || band.bandEnum === ContentBandEnum.Form;
}

/**
 * Loads the content named contentName from /api/content, then its grids as one CONTENT_VIEW_PLANE_NAME plane (one grid per Table or Form band, in band order,
 * each built by the server from the band named by its GridStateDto.custom), and renders every band: Header as h1 (property Text), Table as Data grid of its TableName,
 * Form as RowCount x ColumnCount form, others as their ContentBandEnum (as number). Must be inside its own GridStoreProvider.
 */
function ContentView({ contentName }: { contentName: string }) {
  const { load } = useGridStore();
  const [content, setContent] = useState<ContentDto>();

  // The server redirects to the Sign In page if the user isn't signed in (or the session expired).
  useEffectOnce(() => {
    (async () => {
      const body: ContentRequestDto = { contentName };
      const data = await apiFetch<ContentDto>('content', body);
      // Error (e.g. not signed in): apiFetch already shows the alert.
      if (data === undefined) {
        return;
      }
      setContent(data);
      const gridBands = data.bands.filter(isGridBand);
      if (gridBands.length > 0) {
        await load(CONTENT_VIEW_PLANE_NAME, gridBands.map((band) => ({ state: { custom: { [CONTENT_VIEW_CUSTOM_BAND_NAME]: band.name } } })));
      }
    })().catch(() => {
      // No response; apiFetch already added an Error alert.
    });
  }, [contentName, load]);

  // Grid index of each Table or Form band: its position among them.
  let gridIndex = 0;
  return (
    <div>
      {content?.bands.map((band, index) => {
        if (isGridBand(band)) {
          return <Grid key={index} path={[gridIndex++]} />;
        }
        switch (band.bandEnum) {
          case ContentBandEnum.Header:
            return <h1 key={index}>{contentBandPropertyValue(band, 'Text')}</h1>;
          default:
            return <div key={index}>{band.bandEnum}</div>;
        }
      })}
    </div>
  );
}

/** Renders the content named contentName (see ContentView) with its own store, so its grids don't share a plane with the page's grids of the Layout store. */
export default function Content({ contentName }: { contentName: string }) {
  return (
    <GridStoreProvider>
      <ContentView contentName={contentName} />
    </GridStoreProvider>
  );
}
