import { FaceLivenessDetector } from '@aws-amplify/ui-react-liveness';
import { Amplify } from 'aws-amplify';
import { createElement } from 'react';
import { createRoot } from 'react-dom/client';

import { environment } from '../../environments/environment';

let configuredIdentityPoolId: string | null = null;

export interface FaceLivenessWidgetCallbacks {
  onAnalysisComplete: () => Promise<void>;
  onError: (error: unknown) => void;
  onUserCancel: () => void;
}

export function configureFaceLiveness(): void {
  const identityPoolId = environment.faceLiveness.cognitoIdentityPoolId.trim();
  if (!identityPoolId) {
    throw new Error(
      'Face Liveness requiere un Cognito Identity Pool. Configura faceLiveness.cognitoIdentityPoolId en el archivo de environment.',
    );
  }

  if (configuredIdentityPoolId === identityPoolId) {
    return;
  }

  Amplify.configure({
    Auth: {
      Cognito: {
        identityPoolId,
        allowGuestAccess: true,
      },
    },
  });
  configuredIdentityPoolId = identityPoolId;
}

export function mountFaceLivenessWidget(
  host: HTMLElement,
  sessionId: string,
  callbacks: FaceLivenessWidgetCallbacks,
): () => void {
  configureFaceLiveness();

  const root = createRoot(host);
  root.render(
    createElement(FaceLivenessDetector, {
      sessionId,
      region: environment.faceLiveness.region,
      onAnalysisComplete: callbacks.onAnalysisComplete,
      onError: (error) => callbacks.onError(error),
      onUserCancel: callbacks.onUserCancel,
    }),
  );

  return () => root.unmount();
}
