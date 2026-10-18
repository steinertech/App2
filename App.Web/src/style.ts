export const container = 'container mx-auto px-4';

export const buttonPrimaryClassName =
  'cursor-pointer rounded-md bg-blue-600 px-5 py-2.5 text-base font-medium text-white hover:bg-blue-700';

export const buttonGridClassName =
  'cursor-pointer rounded bg-blue-600 px-2 text-sm font-medium text-white hover:bg-blue-700 disabled:cursor-default disabled:bg-gray-400 disabled:hover:bg-gray-400';

/** Toolbar of a grid (GridCustomEnum.Bar). */
export const gridBarClassName =
  'flex flex-wrap items-center justify-between gap-2 rounded-t-md border border-gray-300 bg-gray-50 px-2 py-1.5 text-sm text-gray-700';

/** Main action of a grid toolbar (e.g. New). */
export const buttonBarPrimaryClassName =
  'cursor-pointer rounded-md bg-blue-600 px-3 py-1 text-sm font-medium text-white shadow-sm hover:bg-blue-700';

/** Secondary action of a grid toolbar (e.g. Save, Reload). */
export const buttonBarClassName =
  'cursor-pointer rounded-md border border-gray-300 bg-white px-3 py-1 text-sm font-medium text-gray-700 shadow-sm hover:bg-gray-100';

/** Icon-only button of a grid toolbar (e.g. Previous/Next page). */
export const buttonBarIconClassName =
  'cursor-pointer rounded-md p-1 text-gray-600 hover:bg-gray-200 disabled:cursor-default disabled:text-gray-300 disabled:hover:bg-transparent';

export const textInputClassName =
  'rounded-md border border-gray-300 px-3 py-1.5 text-base focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500';

/** Second level navigation (Sidebar.tsx): left column on md+, a wrapping row of links above the page on narrow screens. */
export const sidebarClassName =
  'flex shrink-0 flex-wrap gap-1 border-b border-gray-200 pb-3 md:w-56 md:flex-col md:flex-nowrap md:border-r md:border-b-0 md:pr-4 md:pb-0';

export const sidebarLinkClassName =
  'rounded-md px-3 py-2 text-sm font-medium text-gray-600 hover:bg-gray-100 hover:text-gray-900';

export const sidebarLinkActiveClassName = 'rounded-md bg-blue-50 px-3 py-2 text-sm font-semibold text-blue-700';

/** Right hand sidebar of a page (e.g. the Properties grid on the Design page): right column on lg+, below the page content on narrower screens. */
export const sidebarRightClassName =
  'min-w-0 shrink-0 overflow-x-auto border-t border-gray-200 pt-3 lg:w-96 lg:border-t-0 lg:border-l lg:pt-0 lg:pl-4';

/** Sign In button of the navbar (dark background): solid, the main call to action. */
export const buttonNavPrimaryClassName =
  'rounded-md bg-blue-500 px-3 py-1.5 text-sm font-semibold text-white shadow-sm hover:bg-blue-400 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-500';

/** Sign Out button of the navbar (dark background): translucent, outlined. */
export const buttonNavClassName =
  'rounded-md bg-white/10 px-3 py-1.5 text-sm font-semibold text-white shadow-sm ring-1 ring-white/20 ring-inset hover:bg-white/20 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white';
