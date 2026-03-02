import { IpcMain } from 'electron';
import Store from 'electron-store';
import { IPC_CHANNELS, Collection } from '../../shared/types';
import * as crypto from 'crypto';

export function registerCollectionsHandlers(ipcMain: IpcMain, store: Store<any>): void {
  ipcMain.handle(IPC_CHANNELS.COLLECTIONS_GET_ALL, async () => {
    return store.get('collections', []) as Collection[];
  });

  ipcMain.handle(IPC_CHANNELS.COLLECTIONS_CREATE, async (_e, data: { name: string; description?: string }) => {
    const collection: Collection = {
      id: crypto.randomBytes(8).toString('hex'),
      name: data.name,
      description: data.description,
      gameIds: [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    const collections = store.get('collections', []) as Collection[];
    collections.push(collection);
    store.set('collections', collections);

    return collection;
  });

  ipcMain.handle(IPC_CHANNELS.COLLECTIONS_UPDATE, async (_e, id: string, data: Partial<Collection>) => {
    const collections = store.get('collections', []) as Collection[];
    const index = collections.findIndex(c => c.id === id);
    if (index === -1) throw new Error('Collection not found');

    collections[index] = {
      ...collections[index],
      ...data,
      updatedAt: new Date().toISOString(),
    };
    store.set('collections', collections);

    return collections[index];
  });

  ipcMain.handle(IPC_CHANNELS.COLLECTIONS_DELETE, async (_e, id: string) => {
    const collections = store.get('collections', []) as Collection[];
    store.set('collections', collections.filter(c => c.id !== id));
  });
}
