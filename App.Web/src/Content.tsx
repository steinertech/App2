import { useState } from 'react';
import { apiFetch, useEffectOnce } from './util/util-main.ts';
import { ContentBandEnum, DESIGN_BAND_PROPERTY_NAMES } from '../../App.Server/dto/shared/content-dto.ts';
import type { ContentBandDto, ContentDto, ContentRequestDto } from '../../App.Server/dto/shared/content-dto.ts';

/** propertyValue of band's property propertyName (one of DESIGN_BAND_PROPERTY_NAMES[band.bandEnum]); '' if not found. */
function propertyValue(band: ContentBandDto, propertyName: string): string {
  const index = (DESIGN_BAND_PROPERTY_NAMES[band.bandEnum] ?? []).indexOf(propertyName);
  return band.propertyValues[index] ?? '';
}

/** Loads the content named contentName from /api/content and renders every band: Header as h1 (property Text), others as their ContentBandEnum (as number). */
export default function Content({ contentName }: { contentName: string }) {
  const [content, setContent] = useState<ContentDto>();

  // The server redirects to the Sign In page if the user isn't signed in (or the session expired).
  useEffectOnce(() => {
    (async () => {
      const body: ContentRequestDto = { contentName };
      const response = await apiFetch('content', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(body),
      });
      // Error (e.g. not signed in): apiFetch already shows the alert.
      if (response.ok) {
        setContent(await response.json());
      }
    })().catch(() => {
      // No response; apiFetch already added an Error alert.
    });
  }, [contentName]);

  return (
    <div>
      {content?.bands.map((band, index) =>
        band.bandEnum === ContentBandEnum.Header ? <h1 key={index}>{propertyValue(band, 'Text')}</h1> : <div key={index}>{band.bandEnum}</div>,
      )}
    </div>
  );
}
