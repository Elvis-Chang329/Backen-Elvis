import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { FaceRecognition } from './face-recognition';
import { beforeEach, describe, expect, it } from 'vitest';

describe('FaceRecognition', () => {
  let service: FaceRecognition;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        FaceRecognition,
        provideHttpClient(),
        provideHttpClientTesting(),
      ],
    });
    service = TestBed.inject(FaceRecognition);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
