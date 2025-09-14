 import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import { useAuth } from '@/contexts/AuthContext';
import { useDropzone } from 'react-dropzone';
import { 
  ArrowUpTrayIcon, 
  DocumentIcon, 
  ShieldCheckIcon,
  SparklesIcon,
  ChartBarIcon,
  ClockIcon,
  UserGroupIcon,
  AcademicCapIcon,
  ArrowRightIcon,
  CheckCircleIcon
} from '@heroicons/react/24/outline';
import Layout from '@/components/Layout/Layout';

export default function Home() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const [uploadProgress, setUploadProgress] = useState(0);
  const [isUploading, setIsUploading] = useState(false);
  const [currentFeature, setCurrentFeature] = useState(0);

  const features = [
    {
      icon: ShieldCheckIcon,
      title: "AI-Powered Verification",
      description: "Advanced machine learning algorithms detect forged certificates with 99.9% accuracy",
      color: "from-blue-500 to-cyan-500"
    },
    {
      icon: DocumentIcon,
      title: "OCR Text Extraction",
      description: "Extract and validate text from PDF and image documents automatically",
      color: "from-purple-500 to-pink-500"
    },
    {
      icon: ChartBarIcon,
      title: "Real-time Analytics",
      description: "Comprehensive dashboard with fraud trends and verification statistics",
      color: "from-green-500 to-emerald-500"
    },
    {
      icon: ClockIcon,
      title: "Instant Verification",
      description: "Get verification results in seconds, not days",
      color: "from-orange-500 to-red-500"
    }
  ];

  const stats = [
    { label: "Certificates Verified", value: "50,000+", icon: CheckCircleIcon },
    { label: "Fraud Detected", value: "2,500+", icon: ShieldCheckIcon },
    { label: "Institutions", value: "500+", icon: AcademicCapIcon },
    { label: "Accuracy Rate", value: "99.9%", icon: ChartBarIcon }
  ];

  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentFeature((prev) => (prev + 1) % features.length);
    }, 3000);
    return () => clearInterval(interval);
  }, []);

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
        <div className="relative overflow-hidden gradient-bg">
          <div className="absolute inset-0 bg-gradient-to-r from-blue-600/10 to-purple-600/10"></div>
          <div className="max-w-7xl mx-auto py-20 px-4 sm:px-6 lg:px-8 relative">
            <div className="text-center animate-fade-in">
              <div className="inline-flex items-center px-4 py-2 rounded-full bg-blue-100 text-blue-800 text-sm font-medium mb-6 animate-slide-up">
                <SparklesIcon className="w-4 h-4 mr-2" />
                Powered by Advanced AI Technology
              </div>
              
              <h1 className="text-5xl md:text-7xl font-bold text-gray-900 mb-6 animate-slide-up">
                <span className="gradient-text">Authenticity</span>
                <br />
                <span className="gradient-text">Validator</span>
              </h1>
              
              <p className="text-xl md:text-2xl text-gray-600 mb-8 max-w-4xl mx-auto leading-relaxed animate-slide-up">
                Revolutionary AI-powered certificate verification system that detects fake degrees and authenticates educational credentials with unprecedented accuracy
              </p>
              
              <div className="flex flex-col sm:flex-row gap-4 justify-center items-center animate-slide-up">
                <button
                  onClick={() => router.push('/login')}
                  className="btn-primary text-lg px-8 py-4 flex items-center group"
                >
                  Get Started Free
                  <ArrowRightIcon className="w-5 h-5 ml-2 group-hover:translate-x-1 transition-transform" />
                </button>
                
                <button
                  onClick={() => router.push('/dashboard')}
                  className="btn-secondary text-lg px-8 py-4"
                >
                  View Dashboard
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Upload Section */}
        {user && (
          <div className="max-w-7xl mx-auto py-16 px-4 sm:px-6 lg:px-8">
            <div className="text-center animate-fade-in">
              <h2 className="text-4xl font-bold text-gray-900 mb-4">
                Upload Certificate for Verification
              </h2>
              <p className="text-lg text-gray-600 mb-8">
                Drag and drop your certificate file or click to browse
              </p>
            </div>

            <div className="mt-8 max-w-2xl mx-auto">
              <div
                {...getRootProps()}
                className={`card card-hover p-12 text-center cursor-pointer transition-all duration-300 ${
                  isDragActive 
                    ? 'border-blue-400 bg-gradient-to-br from-blue-50 to-purple-50 scale-105' 
                    : 'border-gray-300 hover:border-blue-300'
                }`}
              >
                <input {...getInputProps()} />
                <div className="flex flex-col items-center">
                  <div className={`w-16 h-16 rounded-full flex items-center justify-center mb-4 transition-all duration-300 ${
                    isDragActive 
                      ? 'bg-gradient-to-r from-blue-500 to-purple-500 text-white scale-110' 
                      : 'bg-blue-100 text-blue-600'
                  }`}>
                    <ArrowUpTrayIcon className="w-8 h-8" />
                  </div>
                  
                  <h3 className="text-xl font-semibold text-gray-900 mb-2">
                    {isDragActive ? 'Drop the file here' : 'Drag and drop your certificate here'}
                  </h3>
                  
                  <p className="text-gray-500 mb-2">
                    or click to browse files
                  </p>
                  
                  <div className="flex items-center space-x-4 text-sm text-gray-400">
                    <span className="flex items-center">
                      <DocumentIcon className="w-4 h-4 mr-1" />
                      PDF
                    </span>
                    <span className="flex items-center">
                      <DocumentIcon className="w-4 h-4 mr-1" />
                      JPG
                    </span>
                    <span className="flex items-center">
                      <DocumentIcon className="w-4 h-4 mr-1" />
                      PNG
                    </span>
                    <span className="text-xs">(max 10MB)</span>
                  </div>
                </div>
              </div>

              {isUploading && (
                <div className="mt-6 animate-slide-up">
                  <div className="progress-bar">
                    <div
                      className="progress-fill"
                      style={{ width: `${uploadProgress}%` }}
                    ></div>
                  </div>
                  <p className="mt-3 text-sm text-gray-600 text-center flex items-center justify-center">
                    <div className="spinner mr-2"></div>
                    Uploading... {uploadProgress}%
                  </p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Features Section */}
        <div className="py-20 bg-white">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center mb-16 animate-fade-in">
              <h2 className="text-4xl md:text-5xl font-bold text-gray-900 mb-6">
                Why Choose Our Platform?
              </h2>
              <p className="text-xl text-gray-600 max-w-3xl mx-auto">
                Advanced technology meets user-friendly design to deliver the most comprehensive certificate verification solution
              </p>
            </div>

            <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
              {features.map((feature, index) => (
                <div 
                  key={index}
                  className={`card card-hover p-8 text-center animate-slide-up ${
                    currentFeature === index ? 'ring-2 ring-blue-500 shadow-xl' : ''
                  }`}
                  style={{ animationDelay: `${index * 0.1}s` }}
                >
                  <div className={`w-16 h-16 mx-auto mb-6 rounded-full flex items-center justify-center bg-gradient-to-r ${feature.color} text-white transition-all duration-300 ${
                    currentFeature === index ? 'scale-110 shadow-lg' : ''
                  }`}>
                    <feature.icon className="w-8 h-8" />
                  </div>
                  <h3 className="text-xl font-semibold text-gray-900 mb-4">
                    {feature.title}
                  </h3>
                  <p className="text-gray-600 leading-relaxed">
                    {feature.description}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Stats Section */}
        <div className="bg-gradient-to-r from-blue-600 to-purple-600">
          <div className="max-w-7xl mx-auto py-20 px-4 sm:px-6 lg:px-8">
            <div className="text-center mb-16 animate-fade-in">
              <h2 className="text-4xl md:text-5xl font-bold text-white mb-6">
                Trusted by Educational Institutions
              </h2>
              <p className="text-xl text-blue-100 max-w-3xl mx-auto">
                Join thousands of institutions using our verification system to ensure academic integrity
              </p>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
              {stats.map((stat, index) => (
                <div key={index} className="text-center animate-slide-up" style={{ animationDelay: `${index * 0.1}s` }}>
                  <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-white/20 flex items-center justify-center">
                    <stat.icon className="w-8 h-8 text-white" />
                  </div>
                  <div className="text-3xl md:text-4xl font-bold text-white mb-2">
                    {stat.value}
                  </div>
                  <div className="text-blue-100 font-medium">
                    {stat.label}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* CTA Section */}
        <div className="py-20 bg-gradient-to-br from-gray-50 to-blue-50">
          <div className="max-w-4xl mx-auto text-center px-4 sm:px-6 lg:px-8">
            <div className="animate-fade-in">
              <h2 className="text-4xl md:text-5xl font-bold text-gray-900 mb-6">
                Ready to Secure Academic Integrity?
              </h2>
              <p className="text-xl text-gray-600 mb-8">
                Join thousands of institutions already using our platform to verify certificates and prevent fraud
              </p>
              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <button
                  onClick={() => router.push('/login')}
                  className="btn-primary text-lg px-8 py-4"
                >
                  Start Free Trial
                </button>
                <button className="btn-secondary text-lg px-8 py-4">
                  Contact Sales
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </Layout>
  );
}