import 'vue-router'

declare module 'vue' {
  interface ComponentCustomProperties {
    $t: (key: string, params?: Record<string, string | number>) => any
  }
  interface GlobalDirectives {
    vReveal: typeof import('./directives/reveal').default
    vParallax: typeof import('./directives/parallax').default
    vTilt: typeof import('./directives/tilt').default
  }
}
declare module 'vue-router' {
  interface RouteMeta { auth?: boolean; guest?: boolean }
}
export {}
