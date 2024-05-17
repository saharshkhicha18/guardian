import { Body, Controller, Get, HttpCode, HttpStatus, Post, Req } from '@nestjs/common';
import { Logger } from '@guardian/common';
import { Guardians } from '../../helpers/guardians.js';
import { ApiTags } from '@nestjs/swagger';
import { Auth } from '../../auth/auth.decorator.js';
import { UserRole } from '@guardian/interfaces';
import { UseCache } from '../../helpers/decorators/cache.js';
import { getCacheKey } from '../../helpers/interceptors/utils/index.js';
import { CacheService } from '../../helpers/cache-service.js';

/**
 * Branding route
 */
@Controller('branding')
@ApiTags('branding')
export class BrandingApi{

    constructor(private readonly cacheService: CacheService) {
    }

    @Auth(UserRole.STANDARD_REGISTRY)
    @HttpCode(HttpStatus.NO_CONTENT)
    @Post('/')
    async setBranding(@Body() body: any, @Req() req): Promise<any> {
        try {
            const {
                headerColor,
                primaryColor,
                companyName,
                companyLogoUrl,
                loginBannerUrl,
                faviconUrl,
                headerColor1,
                termsAndConditions
            } = body;

            const data = {
                headerColor,
                primaryColor,
                companyName,
                companyLogoUrl,
                loginBannerUrl,
                faviconUrl,
                headerColor1,
                termsAndConditions
            };

          const guardians = new Guardians();
          await guardians.setBranding(JSON.stringify(data));
          await this.cacheService.invalidate(getCacheKey([req.url], req.user))
        } catch (error) {
          new Logger().error(error, ['API_GATEWAY']);
          throw error;
        }

        return;
    }

    @Get('/')
    @UseCache()
    async getBranding(): Promise<any> {
        try {
            const guardians = new Guardians();
            const brandingDataString = await guardians.getBranding();
            return JSON.parse(brandingDataString.config);
        } catch (error) {
            new Logger().error(error, ['API_GATEWAY']);
            throw error;
        }
    }
}
