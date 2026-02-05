import { useState, useEffect } from 'react';
import { API_URL } from '../lib/api';
import HindusthanLogo from '../images/hindusthan_logo.webp';

interface ImageWithFallbackProps extends Omit<React.ImgHTMLAttributes<HTMLImageElement>, 'src'> {
    src?: string | null;
    fallbackSrc?: string;
}

export function ImageWithFallback({
    src,
    fallbackSrc = HindusthanLogo,
    alt,
    className,
    ...props
}: ImageWithFallbackProps) {
    const [imgSrc, setImgSrc] = useState<string>(fallbackSrc);
    const [hasError, setHasError] = useState(false);

    useEffect(() => {
        if (!src) {
            setImgSrc(fallbackSrc);
            return;
        }

        let finalSrc = src;
        if (src.startsWith('/')) {
            finalSrc = `${API_URL}${src}`;
        } else if (!src.startsWith('http') && !src.startsWith('blob:') && !src.startsWith('data:')) {
            finalSrc = `${API_URL}/${src}`;
        }

        setImgSrc(finalSrc);
        setHasError(false);
    }, [src, fallbackSrc]);

    const handleError = () => {
        if (!hasError) {
            setImgSrc(fallbackSrc);
            setHasError(true);
        }
    };

    return (
        <img
            {...props}
            src={imgSrc}
            alt={alt || 'Image'}
            className={className}
            onError={handleError}
        />
    );
}
