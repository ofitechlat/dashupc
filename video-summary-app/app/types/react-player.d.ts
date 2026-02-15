declare module 'react-player' {
    import { Component } from 'react';
    export interface ReactPlayerProps {
        url?: any;
        playing?: boolean;
        loop?: boolean;
        controls?: boolean;
        volume?: number;
        muted?: boolean;
        playbackRate?: number;
        width?: string | number;
        height?: string | number;
        style?: object;
        progressInterval?: number;
        playsinline?: boolean;
        pip?: boolean;
        stopOnUnmount?: boolean;
        light?: boolean | string;
        playIcon?: React.ReactElement;
        previewTabIndex?: number;
        oEmbedUrl?: string;
        wrapper?: any;
        config?: any;
        onReady?: (player: any) => void;
        onStart?: () => void;
        onPlay?: () => void;
        onProgress?: (state: { played: number; playedSeconds: number; loaded: number; loadedSeconds: number }) => void;
        onDuration?: (duration: number) => void;
        onPause?: () => void;
        onBuffer?: () => void;
        onBufferEnd?: () => void;
        onSeek?: (seconds: number) => void;
        onEnded?: () => void;
        onError?: (error: any, data?: any, hlsInstance?: any, GlobalPlayer?: any) => void;
        onClickPreview?: (event: any) => void;
        onEnablePIP?: () => void;
        onDisablePIP?: () => void;
    }
    export default class ReactPlayer extends Component<ReactPlayerProps> {
        seekTo(amount: number, type?: 'seconds' | 'fraction'): void;
    }
}

declare module 'react-player/youtube' {
    import ReactPlayer from 'react-player';
    export default ReactPlayer;
}
