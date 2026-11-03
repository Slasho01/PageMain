# JarStore — Frontend

Tienda en React (Vite + React Router) para la API de `../jarstoreapi`.

## Arrancar en desarrollo

```bash
# 1. La API (en otra terminal)
cd ../jarstoreapi && cargo run          # escucha en http://127.0.0.1:8080

# 2. El frontend
npm install
npm run dev                             # http://localhost:5173
```

En desarrollo, Vite reenvía todas las peticiones `/api/*` a la API, así que no hace falta configurar CORS.
Si la API corre en otro puerto, copia `.env.example` a `.env` y cambia `API_TARGET`.

## Build de producción

```bash
npm run build      # genera dist/
npm run preview    # sirve dist/ localmente
```

Para producción lo recomendado es que **la API sirva `dist/`** (define `FRONTEND_DIST` en la API): así cada página llega con sus metadatos SEO.
Si la API está en otro dominio, define `VITE_API_URL=https://api.tudominio.com` antes del build y agrega ese origen del frontend a `CORS_ORIGINS` de la API.

## Qué incluye

**Monedas:** botón de moneda en el header (escritorio y móvil) con todas las monedas que tengan tasa en Admin → Tienda → Monedas (CLP, USD, Bs…), su equivalencia, y "Ver precio en" en cada producto. Es solo de visualización: los cobros se hacen en la moneda base.

**Puntos:** "Ganas X puntos" en la ficha y el carrito, canje con control deslizante en el checkout, página `/cuenta/puntos` con saldo e historial, y en el panel la configuración del programa y los ajustes por cliente.

**Navegación:** header con buscador con autocompletado (teclado, búsquedas recientes), mega menú de categorías → subcategorías → marcas, accesos a Ofertas/Novedades/Más vendidos, menú móvil jerárquico, selector de país y moneda.

| Página | URL |
|---|---|
| Portada: carrusel de banners (o producto destacado), beneficios, ofertas, categorías, más vendidos, novedades, marcas, recomendaciones según lo visto, promociones, newsletter | `/` |
| Catálogo con filtros combinables en la URL (subcategoría, marca, precio, stock, oferta, valoración, características) | `/catalogo`, `/categoria/:slug`, `/marca/:slug`, `/buscar?q=`, `/ofertas`, `/novedades`, `/mas-vendidos` |
| Ficha: galería con zoom y `srcset`, variantes, precio anterior, stock, despacho, garantía, especificaciones, compatibilidad, reseñas, complementarios, comprados juntos, relacionados | `/producto/:slug` |
| Carrito, checkout en 3 pasos (Mercado Pago en Chile, manual en Venezuela) y confirmación | `/carrito`, `/checkout`, `/pedido/:id` |
| Cuenta: pedidos con seguimiento y botón para pagar, perfil, direcciones, favoritos, contraseña | `/cuenta/...` |
| Auth: login, registro, recuperar y restablecer contraseña | `/login`, `/registro`, `/recuperar`, `/restablecer` |
| Políticas y páginas informativas | `/p/:slug` |
| Vendedor: subida de imágenes, slug, especificaciones, variantes, complementarios | `/vendedor` |
| Admin: pedidos, tienda (monedas, envíos, pagos por país), páginas, categorías con jerarquía, banners, newsletter, cupones, usuarios | `/admin` |

**SEO:** en producción la API inserta los metadatos y el JSON-LD en el HTML de cada página (ver README de la API). En la SPA se actualizan título, descripción, canonical y `noindex` al navegar; los listados filtrados y las búsquedas no se indexan.

**Rendimiento:** admin, vendedor, checkout y cuenta se cargan bajo demanda; React y el router van en un archivo aparte con caché larga; imágenes responsivas con `srcset` y carga diferida; las imágenes principales (hero, galería) se priorizan.

## Estructura

```
src/
  api.js          cliente HTTP (token, errores)
  auth.jsx        sesión (login, registro, usuario actual)
  cart.jsx        estado del carrito
  toast.jsx       notificaciones
  hooks.js        useFetch
  store.jsx       configuración de la tienda, moneda, país y formato de precios
  seo.js          título, descripción y Open Graph por página
  lib/            catalog.js (URLs con slug, árbol de categorías, vistos), payments.js
  wishlist.jsx    favoritos
  utils.js        fechas, estatus
  components/     Header (+ header/: SearchBox, MegaMenu, MobileMenu), Footer, ProductCard, Img, ImageUploader, Newsletter, OrderView…
  pages/          catálogo, detalle, carrito, órdenes, cuenta, favoritos
  pages/seller/   productos del vendedor
  pages/admin/    panel de administración
```
