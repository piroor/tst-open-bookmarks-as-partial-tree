/*
# This Source Code Form is subject to the terms of the Mozilla Public
# License, v. 2.0. If a copy of the MPL was not distributed with this
# file, You can obtain one at http://mozilla.org/MPL/2.0/.
*/
'use strict';

export async function getItemById(id) {
  if (!id)
    return null;
  try {
    const items = await browser.bookmarks.get(id);
    if (items.length > 0)
      return items[0];
  }
  catch(_error) {
  }
  return null;
}

export async function getPartialTree(itemOrId) {
  const item = typeof itemOrId == 'string' ? (await getItemById(itemOrId)) : itemOrId;
  if (!item ||
      item.type != 'bookmark' ||
      /^place:parent=([^&]+)$/.test(item.url)) // alias for special folders)
    return [];

  const partialTreeItems = [{...item}];

  const matched = item.title.match(/^((>+)\s+)/);
  const commonPrefix = matched && matched[2] || '';
  if (matched)
    partialTreeItems[0].title = item.title.replace(matched[1], '');

  const descendantsMatcher = new RegExp(`^${commonPrefix}>`);
  const items = await browser.bookmarks.getChildren(item.parentId);
  for (const descendant of items.slice(item.index + 1)) {
    if (!descendantsMatcher.test(descendant.title))
      break;
    descendant.title = descendant.title.replace(commonPrefix, '');
    partialTreeItems.push(descendant);
  }
  return partialTreeItems;
}
