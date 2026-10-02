/**
 * Logo del campeonato (public/logo-web.png, versión liviana de public/logo.png).
 */

// width/height reservan el espacio antes de que cargue la imagen; el tamaño real lo da el CSS
export function Logo({ className }) {
  return (
    <img
      className={className}
      src={`${import.meta.env.BASE_URL}logo-web.png`}
      alt="Los Cardales Fútbol"
      width={480}
      height={413}
      decoding="async"
    />
  );
}
