import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { beforeEach, describe, expect, it } from 'vitest';

import { FaceRecognition } from './face-recognition';

describe('FaceRecognition', () => {
  let service: FaceRecognition;
  let httpTestingController: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        FaceRecognition,
        provideHttpClient(),
        provideHttpClientTesting(),
      ],
    });
    service = TestBed.inject(FaceRecognition);
    httpTestingController = TestBed.inject(HttpTestingController);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  it('creates liveness sessions through the backend', async () => {
    const result = service.crearSesionLivenessBackend();

    const request = httpTestingController.expectOne(
      'http://api.aplicacionesweb2026.com:3000/api/liveness/create-session'
    );
    expect(request.request.method).toBe('POST');
    request.flush({ sessionId: 'session-123' });

    await expect(result).resolves.toEqual({ ok: true, sessionId: 'session-123' });
    httpTestingController.verify();
  });

  it('verifies liveness against the profile photo stored by the backend', async () => {
    const response = { ok: true, matched: true, livenessOk: true, similarity: 98 };
    const result = service.verificarConLiveness('joel', 'session-123');

    const request = httpTestingController.expectOne(
      'http://api.aplicacionesweb2026.com:3000/api/liveness/verify'
    );
    expect(request.request.method).toBe('POST');
    expect(request.request.body).toEqual({ userId: 'joel', sessionId: 'session-123' });
    request.flush(response);

    await expect(result).resolves.toEqual(response);
    httpTestingController.verify();
  });
});
