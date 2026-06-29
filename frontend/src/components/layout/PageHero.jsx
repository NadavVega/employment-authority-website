import '../../design/page-hero.css';

export const PageHero = ({
    title,
    subtitle,
    logoSrc,
    logoAlt = '',
    decorationSrc,
    className = '',
    children,
}) => {
    const heroClassName = ['page-hero', className].filter(Boolean).join(' ');

    return (
        <header className={heroClassName}>
            {decorationSrc && (
                <img
                    className="page-hero-decoration"
                    src={decorationSrc}
                    alt=""
                    aria-hidden="true"
                />
            )}

            {logoSrc && (
                <div className="page-hero-logo">
                    <img src={logoSrc} alt={logoAlt} />
                </div>
            )}

            <div className="page-hero-copy">
                <h1>{title}</h1>
                {subtitle && <p>{subtitle}</p>}
            </div>

            {children && (
                <div className="page-hero-extra">
                    {children}
                </div>
            )}
        </header>
    );
};
