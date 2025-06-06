import { ApiResponse } from '../api/helpers/api-response.js';
import {
    BinaryMessageResponse,
    DatabaseServer,
    MessageError,
    MessageResponse,
    PinoLogger,
    Theme,
    ThemeImportExport,
} from '@guardian/common';
import { GenerateUUIDv4, IOwner, MessageAPI } from '@guardian/interfaces';

/**
 * Connect to the message broker methods of working with themes.
 */
export async function themeAPI(logger: PinoLogger): Promise<void> {
    /**
     * Create new theme
     *
     * @param payload - theme
     *
     * @returns {Theme} new theme
     */
    ApiResponse(MessageAPI.CREATE_THEME,
        async (msg: { theme: Theme, owner: IOwner, userId: string | null }) => {
            const userId = msg?.userId
            try {
                if (!msg) {
                    throw new Error('Invalid create theme parameters');
                }
                const { theme, owner } = msg;
                delete theme._id;
                delete theme.id;
                theme.owner = owner.creator;
                theme.uuid = GenerateUUIDv4();

                const item = await DatabaseServer.createTheme(theme);
                return new MessageResponse(item);
            } catch (error) {
                await logger.error(error, ['GUARDIAN_SERVICE'], userId);
                return new MessageError(error);
            }
        });

    /**
     * Update theme
     *
     * @param payload - theme
     *
     * @returns {Theme} theme
     */
    ApiResponse(MessageAPI.UPDATE_THEME,
        async (msg: { themeId: string, theme: Theme, owner: IOwner, userId: string | null }) => {
            const userId = msg?.userId
            try {
                if (!msg) {
                    return new MessageError('Invalid update theme parameters');
                }
                const { themeId, theme, owner } = msg;

                const item = await DatabaseServer.getTheme({ id: themeId, owner: owner.creator });

                if (!item || item.owner !== owner.creator) {
                    return new MessageError('Theme is not found');
                }

                item.name = theme.name;
                item.description = theme.description;
                item.rules = theme.rules;
                item.syntaxGroups = theme.syntaxGroups;

                const result = await DatabaseServer.updateTheme(item);
                return new MessageResponse(result);
            } catch (error) {
                await logger.error(error, ['GUARDIAN_SERVICE'], userId);
                return new MessageError(error);
            }
        });

    /**
     * Get themes
     *
     * @param {any} msg - Get themes parameters
     *
     * @returns {any} themes
     */
    ApiResponse(MessageAPI.GET_THEMES,
        async (msg: { owner: IOwner, userId: string | null }) => {
            const userId = msg?.userId
            try {
                if (!msg) {
                    return new MessageError('Invalid get theme parameters');
                }
                const { owner } = msg;
                const items = await DatabaseServer.getThemes({ owner: owner.creator });
                return new MessageResponse(items);
            } catch (error) {
                await logger.error(error, ['GUARDIAN_SERVICE'], userId);
                return new MessageError(error);
            }
        });

    /**
     * Get theme by Id
     *
     * @param {any} msg - Get themes parameters
     *
     * @returns {any} theme
     */
    ApiResponse(MessageAPI.GET_THEME,
        async (msg: { themeId: string, owner: IOwner, userId: string | null }) => {
            const userId = msg?.userId
            try {
                if (!msg) {
                    return new MessageError('Invalid get theme parameters');
                }
                const { themeId, owner } = msg;
                const item = await DatabaseServer.getTheme({ id: themeId, owner: owner.creator });
                return new MessageResponse(item);
            } catch (error) {
                await logger.error(error, ['GUARDIAN_SERVICE'], userId);
                return new MessageError(error);
            }
        });

    /**
     * Delete theme
     *
     * @param {any} msg - Delete theme parameters
     *
     * @returns {boolean} - Operation success
     */
    ApiResponse(MessageAPI.DELETE_THEME,
        async (msg: { themeId: string, owner: IOwner, userId: string | null }) => {
            const userId = msg?.userId
            try {
                if (!msg) {
                    return new MessageError('Invalid delete theme parameters');
                }
                const { themeId, owner } = msg;
                const item = await DatabaseServer.getTheme({ id: themeId, owner: owner.creator });
                if (!item || item.owner !== owner.creator) {
                    return new MessageError('Theme is not found');
                }
                await DatabaseServer.removeTheme(item);
                return new MessageResponse(true);
            } catch (error) {
                await logger.error(error, ['GUARDIAN_SERVICE'], userId);
                return new MessageError(error);
            }
        });

    /**
     * Export theme
     *
     * @param {any} msg - Export theme parameters
     *
     * @returns {boolean} - zip file
     */
    ApiResponse(MessageAPI.THEME_EXPORT_FILE,
        async (msg: { themeId: string, owner: IOwner, userId: string | null }) => {
            const userId = msg?.userId
            try {
                if (!msg) {
                    return new MessageError('Invalid export theme parameters');
                }
                const { themeId, owner } = msg;
                const item = await DatabaseServer.getTheme({ id: themeId, owner: owner.creator });
                if (!item || item.owner !== owner.creator) {
                    return new MessageError('Theme is not found');
                }
                const zip = await ThemeImportExport.generate(item);
                const file = await zip.generateAsync({
                    type: 'arraybuffer',
                    compression: 'DEFLATE',
                    compressionOptions: {
                        level: 3,
                    },
                });
                return new BinaryMessageResponse(file);
            } catch (error) {
                await logger.error(error, ['GUARDIAN_SERVICE'], userId);
                return new MessageError(error);
            }
        });

    /**
     * Import theme
     *
     * @param {any} msg - Import theme parameters
     *
     * @returns {boolean} - new theme
     */
    ApiResponse(MessageAPI.THEME_IMPORT_FILE,
        async (msg: { zip: any, owner: IOwner, userId: string | null }) => {
            const userId = msg?.userId
            try {
                const { zip, owner } = msg;
                if (!zip) {
                    throw new Error('file in body is empty');
                }

                const preview = await ThemeImportExport.parseZipFile(Buffer.from(zip.data));

                const { theme } = preview;
                delete theme._id;
                delete theme.id;
                theme.uuid = GenerateUUIDv4();
                theme.owner = owner.creator;

                if (await DatabaseServer.getTheme({
                    name: theme.name,
                    owner: owner.creator
                })) {
                    theme.name = theme.name + '_' + Date.now();
                }
                const item = await DatabaseServer.createTheme(theme);

                return new MessageResponse(item);
            } catch (error) {
                await logger.error(error, ['GUARDIAN_SERVICE'], userId);
                return new MessageError(error);
            }
        });
}
