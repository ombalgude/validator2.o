 import { useState } from 'react';
import { useRouter } from 'next/router';
import { useAuth } from '@/contexts/AuthContext';
import { useDropzone } from 'react-dropzone';
import { ArrowUpTrayIcon, DocumentIcon, ShieldCheckIcon } from '@heroicons/react/24/outline';
import Layout from '@/components/Layout/Layout';

export default function Home() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const [uploadProgress, setUploadProgress] = useState(0);
  const [isUploading, setIsUploading] = useState(false);

  const onDrop = async (acceptedFiles: File[]) => {
    if (acceptedFiles.length === 0) return;

    const file = acceptedFiles[0];
    setIsUploading(true);
    setUploadProgress(0);

    try {
      const formData = new FormData();
      formData.append('certificate', file);
      formData.append('studentName', 'Sample Student'); // This would come from a form
      formData.append('rollNumber', '12345');
      formData.append('course', 'Computer Science');
      formData.append('degree', 'Bachelor of Technology');
      formData.append('issueDate', new Date().toISOString());
      formData.append('institutionId', 'sample-institution-id');

      // Simulate upload progress
      const progressInterval = setInterval(() => {
        setUploadProgress(prev => {
          if (prev >= 90) {
            clearInterval(progressInterval);
            return 90;
          }
          return prev + 10;
        });
      }, 200);

      // Upload certificate
      const response = await fetch('/api/certificates/verify', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
        },
        body: formData,
      });

      clearInterval(progressInterval);
      setUploadProgress(100);

      if (response.ok) {
        const result = await response.json();
        router.push(`/certificates/${result.certificate.id}`);
      } else {
        throw new Error('Upload failed');
      }
    } catch (error) {
      console.error('Upload error:', error);
      alert('Upload failed. Please try again.');
    } finally {
      setIsUploading(false);
      setUploadProgress(0);
    }
  };

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'image/*': ['.jpeg', '.jpg', '.png', '.tiff'],
      'application/pdf': ['.pdf']
    },
    maxFiles: 1,
    maxSize: 10 * 1024 * 1024, // 10MB
  });

  if (loading) {
    return (
      <Layout>
        <div className="flex items-center justify-center min-h-screen">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600"></div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="min-h-screen bg-gray-50">
        {/* Hero Section */}
        <div className="bg-white">
          <div className="max-w-7xl mx-auto py-16 px-4 sm:px-6 lg:px-8">
            <div className="text-center">
              <h1 className="text-4xl font-extrabold text-gray-900 sm:text-5xl md:text-6xl">
                <span className="block">Authenticity Validator</span>
                <span className="block text-blue-600">for Academia</span>
              </h1>
              <p className="mt-3 max-w-md mx-auto text-base text-gray-500 sm:text-lg md:mt-5 md:text-xl md:max-w-3xl">
                AI-powered certificate verification system to detect fake degrees and authenticate educational credentials
              </p>
              <div className="mt-5 max-w-md mx-auto sm:flex sm:justify-center md:mt-8">
                <div className="rounded-md shadow">
                  <button
                    onClick={() => router.push('/login')}
                    className="w-full flex items-center justify-center px-8 py-3 border border-transparent text-base font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 md:py-4 md:text-lg md:px-10"
                  >
                    Get Started
                  </button>
                </div>
                <div className="mt-3 rounded-md shadow sm:mt-0 sm:ml-3">
                  <button
                    onClick={() => router.push('/dashboard')}
                    className="w-full flex items-center justify-center px-8 py-3 border border-transparent text-base font-medium rounded-md text-blue-600 bg-white hover:bg-gray-50 md:py-4 md:text-lg md:px-10"
                  >
                    View Dashboard
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Upload Section */}
        {user && (
          <div className="max-w-7xl mx-auto py-16 px-4 sm:px-6 lg:px-8">
            <div className="text-center">
              <h2 className="text-3xl font-extrabold text-gray-900">
                Upload Certificate for Verification
              </h2>
              <p className="mt-4 text-lg text-gray-600">
                Drag and drop your certificate file or click to browse
              </p>
            </div>

            <div className="mt-8 max-w-2xl mx-auto">
              <div
                {...getRootProps()}
                className={`border-2 border-dashed rounded-lg p-12 text-center hover:border-gray-400 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 cursor-pointer transition-colors ${
                  isDragActive ? 'border-blue-400 bg-blue-50' : 'border-gray-300'
                }`}
              >
                <input {...getInputProps()} />
                <ArrowUpTrayIcon className="mx-auto h-12 w-12 text-gray-400" />
                <div className="mt-4">
                  <p className="text-lg font-medium text-gray-900">
                    {isDragActive ? 'Drop the file here' : 'Drag and drop your certificate here'}
                  </p>
                  <p className="mt-2 text-sm text-gray-500">
                    or click to browse files
                  </p>
                  <p className="mt-1 text-xs text-gray-400">
                    Supports PDF, JPG, PNG, TIFF (max 10MB)
                  </p>
                </div>
              </div>

              {isUploading && (
                <div className="mt-4">
                  <div className="bg-gray-200 rounded-full h-2">
                    <div
                      className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                      style={{ width: `${uploadProgress}%` }}
                    ></div>
                  </div>
                  <p className="mt-2 text-sm text-gray-600 text-center">
                    Uploading... {uploadProgress}%
                  </p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Features Section */}
        <div className="py-16 bg-white">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center">
              <h2 className="text-3xl font-extrabold text-gray-900">
                Why Choose Our Verification System?
              </h2>
              <p className="mt-4 text-lg text-gray-600">
                Advanced AI technology ensures accurate and reliable certificate verification
              </p>
            </div>

            <div className="mt-16">
              <div className="grid grid-cols-1 gap-8 sm:grid-cols-2 lg:grid-cols-3">
                <div className="text-center">
                  <div className="flex items-center justify-center h-12 w-12 rounded-md bg-blue-500 text-white mx-auto">
                    <DocumentIcon className="h-6 w-6" />
                  </div>
                  <h3 className="mt-4 text-lg font-medium text-gray-900">OCR Technology</h3>
                  <p className="mt-2 text-base text-gray-500">
                    Advanced optical character recognition extracts text from certificates with high accuracy
                  </p>
                </div>

                <div className="text-center">
                  <div className="flex items-center justify-center h-12 w-12 rounded-md bg-blue-500 text-white mx-auto">
                    <ShieldCheckIcon className="h-6 w-6" />
                  </div>
                  <h3 className="mt-4 text-lg font-medium text-gray-900">Tampering Detection</h3>
                  <p className="mt-2 text-base text-gray-500">
                    AI-powered algorithms detect digital tampering and forgery attempts
                  </p>
                </div>

                <div className="text-center">
                  <div className="flex items-center justify-center h-12 w-12 rounded-md bg-blue-500 text-white mx-auto">
                    <DocumentIcon className="h-6 w-6" />
                  </div>
                  <h3 className="mt-4 text-lg font-medium text-gray-900">Real-time Verification</h3>
                  <p className="mt-2 text-base text-gray-500">
                    Instant verification results with detailed analysis and confidence scores
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Stats Section */}
        <div className="bg-blue-600">
          <div className="max-w-7xl mx-auto py-16 px-4 sm:px-6 lg:px-8">
            <div className="text-center">
              <h2 className="text-3xl font-extrabold text-white">
                Trusted by Educational Institutions
              </h2>
              <p className="mt-4 text-lg text-blue-200">
                Join thousands of institutions using our verification system
              </p>
            </div>

            <div className="mt-16 grid grid-cols-1 gap-8 sm:grid-cols-2 lg:grid-cols-4">
              <div className="text-center">
                <div className="text-4xl font-extrabold text-white">10,000+</div>
                <div className="mt-2 text-lg text-blue-200">Certificates Verified</div>
              </div>
              <div className="text-center">
                <div className="text-4xl font-extrabold text-white">500+</div>
                <div className="mt-2 text-lg text-blue-200">Institutions</div>
              </div>
              <div className="text-center">
                <div className="text-4xl font-extrabold text-white">99.5%</div>
                <div className="mt-2 text-lg text-blue-200">Accuracy Rate</div>
              </div>
              <div className="text-center">
                <div className="text-4xl font-extrabold text-white">24/7</div>
                <div className="mt-2 text-lg text-blue-200">Support</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </Layout>
  );
}