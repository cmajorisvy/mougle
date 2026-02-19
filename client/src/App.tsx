import { useEffect, useRef, useState } from 'react';
import { renderer } from './core/Renderer';
import { sceneManager } from './core/SceneManager';
import { interactionManager } from './core/InteractionManager';
import { eventBus } from './core/EventBus';
import { useAppStore } from './state/store';
import { HomeScene } from './scenes/HomeScene';
import { DebatesScene } from './scenes/DebatesScene';
import { LiveStudioScene } from './scenes/LiveStudioScene';
import {
  createDiscussionsScene,
  createRankingsScene,
  createAINewsScene,
  createAgentsScene,
  createProfileScene,
  createBillingScene,
  createCreditsScene,
  createSettingsScene,
  createAuthScene,
} from './scenes/GenericScene';
import { Fallback2D } from './Fallback2D';

const ROUTE_TO_SCENE: Record<string, string> = {
  '/': 'home',
  '/discussions': 'discussions',
  '/live-debates': 'debates',
  '/ai-news-updates': 'aiNews',
  '/agent-dashboard': 'agents',
  '/agent-portal': 'agents',
  '/ranking': 'rankings',
  '/profile': 'profile',
  '/billing': 'billing',
  '/credits': 'credits',
  '/settings': 'settings',
  '/auth/signin': 'auth',
  '/auth/signup': 'auth',
  '/notifications': 'profile',
  '/content-flywheel': 'debates',
  '/admin': 'settings',
  '/admin/login': 'auth',
  '/admin/founder-control': 'settings',
  '/admin/command-center': 'settings',
  '/admin/revenue': 'billing',
  '/admin/flywheel': 'debates',
  '/admin/phase-transition': 'settings',
};

function navigateTo(path: string) {
  window.history.pushState({}, '', path);
  window.dispatchEvent(new PopStateEvent('popstate'));
}

function App() {
  const containerRef = useRef<HTMLDivElement>(null);
  const [location, setLocationState] = useState(window.location.pathname);
  const [webglFailed, setWebglFailed] = useState(false);
  const setRoute = useAppStore((s) => s.setRoute);
  const scenesRegistered = useRef(false);
  const studioScene = useRef<LiveStudioScene | null>(null);

  useEffect(() => {
    const handlePopState = () => {
      setLocationState(window.location.pathname);
    };
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  useEffect(() => {
    if (!containerRef.current || webglFailed) return;

    const failUnsub = eventBus.on('webglFailed', () => {
      setWebglFailed(true);
    });

    try {
      renderer.mount(containerRef.current);
    } catch (e) {
      console.warn('WebGL mount failed:', e);
      setWebglFailed(true);
      return;
    }

    if (!renderer.webglAvailable || !renderer.renderer) {
      setWebglFailed(true);
      return;
    }

    interactionManager.attach(renderer.renderer.domElement);

    renderer.onRender((dt, elapsed) => {
      sceneManager.update(dt, elapsed);
    });

    renderer.start();

    if (!scenesRegistered.current) {
      scenesRegistered.current = true;

      sceneManager.register(new HomeScene());
      sceneManager.register(new DebatesScene());

      const ls = new LiveStudioScene();
      studioScene.current = ls;
      sceneManager.register(ls);

      sceneManager.register(createDiscussionsScene());
      sceneManager.register(createRankingsScene());
      sceneManager.register(createAINewsScene());
      sceneManager.register(createAgentsScene());
      sceneManager.register(createProfileScene());
      sceneManager.register(createBillingScene());
      sceneManager.register(createCreditsScene());
      sceneManager.register(createSettingsScene());
      sceneManager.register(createAuthScene());
    }

    const navUnsub = eventBus.on('navigate', (route: string) => {
      navigateTo(route);
    });

    return () => {
      navUnsub();
      failUnsub();
      if (renderer.renderer) {
        interactionManager.detach(renderer.renderer.domElement);
      }
      renderer.stop();
    };
  }, [webglFailed]);

  useEffect(() => {
    setRoute(location);

    if (webglFailed) return;

    const studioMatch = location.match(/^\/live-studio\/(\d+)/);
    if (studioMatch) {
      const debateId = parseInt(studioMatch[1]);
      sceneManager.transition('liveStudio').then(() => {
        studioScene.current?.setDebateId(debateId);
      });
      return;
    }

    const detailMatch = location.match(/^\/debate\/(\d+)/);
    if (detailMatch) {
      const debateId = parseInt(detailMatch[1]);
      sceneManager.transition('liveStudio').then(() => {
        studioScene.current?.setDebateId(debateId);
      });
      return;
    }

    if (location.match(/^\/post\//)) {
      sceneManager.transition('discussions');
      return;
    }

    if (location.match(/^\/topic\//)) {
      sceneManager.transition('discussions');
      return;
    }

    const sceneName = ROUTE_TO_SCENE[location] || 'home';
    sceneManager.transition(sceneName);
  }, [location, setRoute, webglFailed]);

  if (webglFailed) {
    return <Fallback2D location={location} onNavigate={navigateTo} />;
  }

  return (
    <div
      ref={containerRef}
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        width: '100vw',
        height: '100vh',
        overflow: 'hidden',
        background: '#050510',
      }}
      data-testid="webgl-canvas-container"
    />
  );
}

export default App;
