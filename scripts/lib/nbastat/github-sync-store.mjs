// Retired: a branch in a public repository is not private storage.
// Keep the export fail-closed so existing future callers cannot publish checkpoints.
// No Git, network, filesystem, encryption or credential handling is performed here.
import {NbaStatError} from './client.mjs';
export function githubSyncStore(){
 throw new NbaStatError('PUBLIC_REPOSITORY_CHECKPOINT_ADAPTER_DISABLED');
}
