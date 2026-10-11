import { useState } from 'react';
import { apiFetch, useEffectOnce } from './util/util-main.ts';
import type { ContentDto, ContentRequestDto } from '../../App.Server/dto/shared/content-dto.ts';

/** Loads the content named contentName from /api/content and renders the ContentBandEnum (as number) of every band. */
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
      {content?.bands.map((band, index) => (
        <div key={index}>{band.bandEnum}</div>
      ))}
    </div>
  );
}
