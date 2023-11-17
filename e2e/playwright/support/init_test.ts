// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import path from 'node:path';
import fs from 'node:fs';

import {test} from '@e2e-support/test_fixture';
import {DeepPartial} from '@mattermost/types/utilities';
import {AdminConfig} from '@mattermost/types/config';

import {cleanUpBotDMs} from './utils';
import {clearKVStoreForPlugin} from './kv';
import {preferencesForUser} from './user';

const pluginDistPath = path.join(__dirname, '../../../dist');
const pluginId = 'com.mattermost.plugin-todo';
const botUsername = 'todo'

// # One time tasks
test.beforeAll(async ({pw}) => {
    const {adminClient, adminUser} = await pw.getAdminClient();
    if (adminUser === null) {
        throw new Error('can not get adminUser');
    }

    // Clear KV store
    await clearKVStoreForPlugin(pluginId);

    // Upload and enable plugin
    const files = await fs.promises.readdir(pluginDistPath);
    const bundle = files.find((fname) => fname.endsWith('.tar.gz'));
    if (!bundle) {
        throw new Error('Failed to find plugin bundle in dist folder');
    }

    const bundlePath = path.join(pluginDistPath, bundle);
    await adminClient.uploadPluginX(bundlePath, true);
    await adminClient.enablePlugin(pluginId);

    // Configure plugin
    const config = await adminClient.getConfig();
    const newConfig: DeepPartial<AdminConfig> = {
        ServiceSettings: {
            EnableTutorial: false,
            EnableOnboardingFlow: false,
        },
        PluginSettings: {
            ...config.PluginSettings,
            Plugins: {
                ...config.PluginSettings.Plugins,
                [pluginId]: todoConfig as any,
            },
        },
    };

    await adminClient.patchConfig(newConfig);
    await adminClient.savePreferences(adminUser.id, preferencesForUser(adminUser.id));
});

// # Clear bot DM channel
test.beforeEach(async ({pw}) => {
    const {adminClient, adminUser} = await pw.getAdminClient();
    if (adminUser === null) {
        throw new Error('can not get adminUser');
    }
    await cleanUpBotDMs(adminClient, adminUser.id, botUsername);
});

type TodoPluginSettings = {
    encryptionkey: string;
    webhooksecret: string;
}

const todoConfig: TodoPluginSettings = {
    encryptionkey: 'S9YasItflsENXnrnKUhMJkdosXTsr6Tc',
    webhooksecret: 'w7HfrdZ+mtJKnWnsmHMh8eKzWpQH7xET',
};
