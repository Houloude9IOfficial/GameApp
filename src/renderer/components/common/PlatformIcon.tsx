import React from 'react';
import { PlatformName } from '../../../shared/types';
import { Tooltip } from './Tooltip';

interface PlatformIconProps {
  platform: PlatformName;
  size?: number;
  active?: boolean;
  className?: string;
}

const platformLabels: Record<PlatformName, string> = {
  steam: 'Steam',
  epic: 'Epic Games',
  gog: 'GOG',
  ubisoft: 'Ubisoft Connect',
  ea: 'EA App',
  xbox: 'Xbox',
  microsoft: 'Microsoft Store',
  playstation: 'PlayStation Store',
  rockstar: 'Rockstar Games'
};

function SteamIcon({ size }: { size: number }) {
  return (
<svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 24 24"><path fill="currentColor" fillRule="evenodd" d="M5 1a4 4 0 0 0-4 4v14a4 4 0 0 0 4 4h14a4 4 0 0 0 4-4V5a4 4 0 0 0-4-4zm6.985 19a8 8 0 1 0-7.97-8.697l4.306 1.814a2.35 2.35 0 0 1 1.376-.389l1.751-2.496a3.09 3.09 0 1 1 3.001 2.858l-2.476 1.756a2.364 2.364 0 0 1-4.689.596L4.285 14.18a8.004 8.004 0 0 0 7.7 5.821Zm-2.364-3.179a1.73 1.73 0 0 1-1.598-1.067l.989.416A1.273 1.273 0 1 0 10 13.825l-.906-.382a1.73 1.73 0 1 1 .528 3.378Zm5.022-8.82a2 2 0 1 0 0 4a2 2 0 0 0 0-4m-1.273 2a1.273 1.273 0 1 1 2.545 0a1.273 1.273 0 0 1-2.545 0" clipRule="evenodd"></path></svg>
  );
}

function EpicIcon({ size }: { size: number }) {
  return (
<svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 24 24"><path fill="currentColor" fillRule="evenodd" d="M5 1a4 4 0 0 0-4 4v14a4 4 0 0 0 4 4h14a4 4 0 0 0 4-4V5a4 4 0 0 0-4-4zm1.182 3.5A1.09 1.09 0 0 0 5.09 5.59v11.637c0 .144.084.274.216.333l6.545 2.909a.36.36 0 0 0 .296 0l6.545-2.91a.36.36 0 0 0 .216-.332V5.591a1.09 1.09 0 0 0-1.09-1.091zm6.363 2.364h1.091v6.182h-1.09V6.864ZM9.091 17.227L12 18.682l2.909-1.455zm-2-4.181V6.864h2v1.09h-.91V9.41h.91v1.09h-.91v1.454h.91v1.091zm2.545 0V6.864h1.273c.703 0 1.273.57 1.273 1.272v1.819c0 .703-.57 1.272-1.273 1.272h-.182v1.819zm5.273-6.182a.91.91 0 0 0-.91.909v4.363c0 .502.408.91.91.91h1.09a.91.91 0 0 0 .91-.91v-1.454h-1.09v1.272h-.728v-4h.727v1.273h1.091V7.773a.91.91 0 0 0-.91-.91h-1.09Zm1.09 8.727H7.274V14.5H16zm-5.272-5.455h.182c.1 0 .182-.081.182-.181V8.136c0-.1-.082-.181-.182-.181h-.182z" clipRule="evenodd"></path></svg>
  );
}

function GogIcon({ size }: { size: number }) {
  return (
<svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 24 24"><path fill="currentColor" fillRule="evenodd" d="M5 1a4 4 0 0 0-4 4v14a4 4 0 0 0 4 4h14a4 4 0 0 0 4-4V5a4 4 0 0 0-4-4zm5.933 4.956c-.687 0-1.244.557-1.244 1.244v2.133c0 .688.557 1.245 1.244 1.245h2.134c.687 0 1.244-.557 1.244-1.245V7.2c0-.687-.557-1.244-1.244-1.244zM10.756 7.2c0-.098.08-.178.177-.178h2.134c.098 0 .177.08.177.178v2.133c0 .099-.08.178-.177.178h-2.134a.18.18 0 0 1-.177-.178zm-.534 6.222c-.687 0-1.244.557-1.244 1.245V16.8c0 .687.557 1.244 1.244 1.244h2.134c.687 0 1.244-.557 1.244-1.244v-2.133c0-.688-.557-1.245-1.244-1.245zm-.178 1.245c0-.098.08-.178.178-.178h2.134c.098 0 .177.08.177.178V16.8c0 .098-.08.178-.177.178h-2.134a.18.18 0 0 1-.178-.178zm-4.8-1.245c-.687 0-1.244.557-1.244 1.245V16.8c0 .687.557 1.244 1.244 1.244H8.09v-1.066H5.244a.18.18 0 0 1-.177-.178v-2.133c0-.098.08-.178.177-.178H8.09v-1.067zm10.134 1.245c0-.098.08-.178.178-.178h1.066v3.378h1.067v-3.378h1.244v3.378H20v-4.445h-4.444c-.688 0-1.245.557-1.245 1.245v3.2h1.067zM4 7.2c0-.687.557-1.244 1.244-1.244h2.134c.687 0 1.244.557 1.244 1.244v3.911c0 .687-.557 1.245-1.244 1.245h-3.2v-1.067h3.2c.098 0 .178-.08.178-.178V7.2a.18.18 0 0 0-.178-.178H5.244a.18.18 0 0 0-.177.178v2.133c0 .099.08.178.177.178h1.778v1.067H5.244A1.244 1.244 0 0 1 4 9.333zm11.378 0c0-.687.557-1.244 1.244-1.244h2.134c.687 0 1.244.557 1.244 1.244v3.911c0 .687-.557 1.245-1.244 1.245h-3.2v-1.067h3.2c.098 0 .177-.08.177-.178V7.2a.18.18 0 0 0-.177-.178h-2.134a.18.18 0 0 0-.178.178v2.133c0 .099.08.178.178.178H18.4v1.067h-1.778a1.244 1.244 0 0 1-1.244-1.245z" clipRule="evenodd"></path></svg>
  );
}

function UbisoftIcon({ size }: { size: number }) {
  return (
<svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 24 24"><path fill="currentColor" fillRule="evenodd" d="M5 1a4 4 0 0 0-4 4v14a4 4 0 0 0 4 4h14a4 4 0 0 0 4-4V5a4 4 0 0 0-4-4zM4 12a8 8 0 0 0 7.982 8H12a8 8 0 1 0-8-8m1.453-2.288c.342-.427.736-.82 1.165-1.163c1.478-1.183 3.482-1.86 5.464-1.25c1.149.353 1.978.93 2.547 1.637c.568.705.855 1.512.97 2.295c.21 1.437-.153 2.86-.53 3.605a3.378 3.378 0 1 1-5.421-3.838c-1.065.33-1.848 1.058-2.032 2.079c-.34 1.885.454 3.335 1.522 4.342a6.7 6.7 0 0 0 1.67 1.147c.532.255.953.36 1.169.367H12a6.933 6.933 0 1 0-6.547-9.221m9.05 1.442a3.4 3.4 0 0 0-.65-.557c-1.29-.863-2.95-1.051-4.354-.667c-1.407.386-2.649 1.38-2.933 2.957c-.342 1.898.26 3.437 1.171 4.581a6.93 6.93 0 0 1-2.576-4.32c.02-1.287.843-2.742 2.123-3.766c1.287-1.03 2.932-1.541 4.485-1.064c.967.297 1.607.762 2.03 1.287c.372.464.593.997.704 1.55Zm-.398 3.224a2.311 2.311 0 1 0-.034.072l-.004-.003l.038-.07Z" clipRule="evenodd"></path></svg>
  );
}

function EaIcon({ size }: { size: number }) {
  return (
<svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 24 24"><path fill="currentColor" fillRule="evenodd" d="M5 1a4 4 0 0 0-4 4v14a4 4 0 0 0 4 4h14a4 4 0 0 0 4-4V5a4 4 0 0 0-4-4zm.818 10.09l-1.09 1.455h1.5L4 15.818h8.364l2.909-4.727l1.09 1.818h-1.09l-.897 1.454h2.715l1.09 1.455H20l-4.727-7.636l-4 6.181H6.909l1.321-1.818h2.68L12 11.091zm1.818-2.908l-1.09 1.454h6.181l1.091-1.454z" clipRule="evenodd"></path></svg>
  );
}

function PlayStationIcon({ size }: { size: number }) {
  return (
<svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 24 24"><path fill="currentColor" fillRule="evenodd" d="M5 1a4 4 0 0 0-4 4v14a4 4 0 0 0 4 4h14a4 4 0 0 0 4-4V5a4 4 0 0 0-4-4zm4.976 16.322l2.618.879V8.69c0-.33.223-.728.489-.728c.338 0 .552.46.552.729v3.585c.216.126.723.378 1.02.378h.023c.404.001 1.814.005 1.814-2.145c0-2.192-1.157-3.02-2.122-3.335L9.976 5.8zm-.727-.657v-1.263c-.61.227-1.169.41-1.513.464c-.647.1-1.35.027-1.262-.341c.075-.315 1.68-.874 2.775-1.221v-1.437C7.173 13.515 4 14.611 4 15.342c0 1.034 2.428 1.344 2.997 1.378c.332.02 1.254.053 2.252-.055M20 14.895c0 .697-4.259 2.287-6.678 3.094v-1.504a220 220 0 0 0 3.526-1.314c.861-.345 1.016-.569.603-.758c-.267-.123-.844-.152-1.343 0a66 66 0 0 0-2.786.954V13.93c.918-.25 1.895-.45 2.682-.482c1.54-.06 3.996.534 3.996 1.447" clipRule="evenodd"></path></svg>
  );
}

function RockstarIcon({ size }: { size: number }) {
  return (
<svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 24 24"><path fill="currentColor" d="M5.971 6.816h3.241c1.469 0 2.741-.448 2.741-2.084c0-1.3-1.117-1.576-2.19-1.576H6.748zm12.834 8.753h5.168l-4.664 3.228l.755 5.087l-4.041-3.07L10.599 24l2.536-5.392s-2.95-3.075-2.947-3.075c-.198-.262-.265-.936-.265-1.226c0-.367.024-.739.049-1.134c.028-.451.058-.933.058-1.476c0-1.338-.59-2.038-2.036-2.038H5.283l-1.18 5.525H.026L3.269 0h7.672c2.852 0 5.027.702 5.027 3.936c0 2.276-1.12 3.894-3.592 4.233v.045c1.162.276 1.598 1.062 1.598 2.527c0 .585-.018 1.098-.034 1.581c-.015.428-.03.834-.03 1.243c0 .525.137 1.382.48 1.968h.567l3.028-5.06zm-1.233-2.948l-2.187 3.654h-3.457l2.103 2.189l-1.73 3.672l3.777-2.218l2.976 2.263l-.553-3.731l3.093-2.139h-3.43z"></path></svg>
);
}

function XboxIcon({ size }: { size: number }) {
  return (
<svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 24 24"><path fill="currentColor" fill-rule="evenodd" d="M5 1a4 4 0 0 0-4 4v14a4 4 0 0 0 4 4h14a4 4 0 0 0 4-4V5a4 4 0 0 0-4-4zm7 3a8 8 0 0 0-3.526.817A12.9 12.9 0 0 1 12 6.427a12.9 12.9 0 0 1 3.526-1.61A8 8 0 0 0 12 4m-8 8c0 1.684.52 3.246 1.408 4.535c.882-3.511 2.448-6.393 4.573-8.478c-1.206-.93-2.383-1.62-3.392-1.95A7.98 7.98 0 0 0 4 12m13.451 5.855A7.97 7.97 0 0 1 12 20a7.97 7.97 0 0 1-5.451-2.145c.872-2.72 3.063-5.724 5.451-8.041c2.389 2.317 4.579 5.321 5.451 8.041M20 12c0 1.683-.52 3.245-1.408 4.534c-.882-3.51-2.448-6.392-4.573-8.477c1.206-.93 2.383-1.62 3.392-1.95A7.98 7.98 0 0 1 20 12" clip-rule="evenodd"/></svg>
  );
}

function MicrosoftIcon({ size }: { size: number }) {
  return (
<svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 24 24"><path fill="currentColor" fillRule="evenodd" d="M5 1a4 4 0 0 0-4 4v14a4 4 0 0 0 4 4h14a4 4 0 0 0 4-4V5a4 4 0 0 0-4-4zm6.318 3.5H4.5v6.818h6.818zm8.182 0h-6.818v6.818H19.5zm-15 8.182h6.818V19.5H4.5zm15 0h-6.818V19.5H19.5z" clipRule="evenodd"></path></svg>
  );
}

const iconComponents: Record<PlatformName, React.FC<{ size: number }>> = {
  steam: SteamIcon,
  epic: EpicIcon,
  gog: GogIcon,
  ubisoft: UbisoftIcon,
  ea: EaIcon,
  xbox: XboxIcon,
  playstation: PlayStationIcon,
  microsoft: MicrosoftIcon,
  rockstar: RockstarIcon,
};

export function PlatformIcon({ platform, size = 16, active = false, className = '' }: PlatformIconProps) {
  const Icon = iconComponents[platform];
  if (!Icon) return null;

  return (
    <Tooltip text={`${platformLabels[platform]}${active ? ' (Source)' : ''}`}>
      <span
        className={`inline-flex items-center justify-center transition-colors ${
          active ? 'text-success' : 'text-text-muted opacity-40'
        } ${className}`}
      >
        <Icon size={size} />
      </span>
    </Tooltip>
  );
}

interface PlatformIconsProps {
  platforms?: PlatformName[];
  sourcePlatform?: PlatformName;
  size?: number;
  className?: string;
}

export function PlatformIcons({ platforms, sourcePlatform, size = 16, className = '' }: PlatformIconsProps) {
  if (!platforms || platforms.length === 0) return null;

  return (
    <div className={`flex items-center gap-1.5 ${className}`}>
      {platforms.map(p => (
        <PlatformIcon
          key={p}
          platform={p}
          size={size}
          active={p === sourcePlatform}
        />
      ))}
    </div>
  );
}
