import type { AccountRouteDefinition, ServerRouteDefinition } from '@/routers/routes';

/**
 * Routes you add yourself. This file belongs to you: the theme ships it once and
 * the updater never writes over it again, so anything declared here survives an
 * update that replaces every other file in the panel.
 *
 * Put addon routes here rather than in `routes.ts`. An addon installer will tell
 * you to edit `routes.ts` — that file is replaced on every update and your lines
 * go with it. The entries below are spread into the same arrays, so the result is
 * identical and it keeps working afterwards.
 *
 * A route added here also needs a tab before it appears in the navigation:
 * Live editor → Navigation → Server tabs → Add tab, pointing at the same path you
 * used for `path` below. That tab is stored in the database, so it survives
 * updates on its own.
 *
 * A worked example. Take the import line the installer gave you, and the object
 * it wanted added to the `server` array, and write them like this:
 *
 *     import MyAddonContainer from '@/components/server/myaddon/MyAddonContainer';
 *
 *     export const server: ServerRouteDefinition[] = [
 *         {
 *             path: '/my-addon',
 *             name: 'My addon',
 *             permission: 'file.read',
 *             component: MyAddonContainer,
 *         },
 *     ];
 *
 * `name` is what the navigation calls it, and a route without one is reachable
 * but never listed. `permission` takes a single key, a list of them, or null for
 * anybody who can see the server at all. For a heavy page, write
 * `const MyAddonContainer = lazy(() => import('…'))` with `lazy` imported from
 * react, so it is only fetched when somebody opens it.
 *
 * Run `yarn build:production` after editing this file.
 */

/** Extra pages inside a server, at /server/<id>/<path>. */
export const server: ServerRouteDefinition[] = [];

/** Extra pages in the account area, at /account/<path>. */
export const account: AccountRouteDefinition[] = [];
