import { useState, useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import { useAuth } from '@/contexts/AuthContext';
import { certificateApi } from '@/utils/api';
import { formatFileSize, getErrorMessage } from '@/utils/helpers';
import {
  CloudArrowUpIcon,
  DocumentIcon,
  XMarkIcon,
  CheckCircleIcon,
  ExclamationTriangleIcon,
} from '@heroicons/react/24/outline';

interface UploadFormProps {
  onUploadComplete?: (certificate: any) => void;
  onUploadError?: (error: string) => void;
}

interface FileWithPreview extends File {
  preview: string;
  id: string;
}

export default function UploadForm({ onUploadComplete, onUploadError }: UploadFormProps) {
  const { user } = useAuth();
  const [files, setFiles] = useState<FileWithPreview[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [formData, setFormData] = useState({
    studentName: '',
    rollNumber: '',
    course: '',
    degree: '',
    issueDate: '',
    institutionId: '',
    grades: {},
  });

  const onDrop = useCallback((acceptedFiles: File[]) => {
    const newFiles = acceptedFiles.map((file) => ({
      ...file,
      preview: URL.createObjectURL(file),
      id: Math.random().toString(36).substr(2, 9),
    }));

    setFiles((prevFiles) => [...prevFiles, ...newFiles]);
  }, []);

  const removeFile = (fileId: string) => {
    setFiles((prevFiles) => {
      const fileToRemove = prevFiles.find((file) => file.id === fileId);
      if (fileToRemove) {
        URL.revokeObjectURL(fileToRemove.preview);
      }
      return prevFiles.filter((file) => file.id !== fileId);
    });
  };

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'image/*': ['.jpeg', '.jpg', '.png', '.tiff'],
      'application/pdf': ['.pdf'],
    },
    maxFiles: 5,
    maxSize: 10 * 1024 * 1024, // 10MB
  });

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (files.length === 0) {
      onUploadError?.('Please select at least one file to upload');
      return;
    }

    if (!formData.studentName || !formData.rollNumber || !formData.course || !formData.degree) {
      onUploadError?.('Please fill in all required fields');
      return;
    }

    setIsUploading(true);
    setUploadProgress(0);

    try {
      const uploadPromises = files.map(async (file, index) => {
        const formDataToSend = new FormData();
        formDataToSend.append('certificate', file);
        formDataToSend.append('studentName', formData.studentName);
        formDataToSend.append('rollNumber', formData.rollNumber);
        formDataToSend.append('course', formData.course);
        formDataToSend.append('degree', formData.degree);
        formDataToSend.append('issueDate', formData.issueDate || new Date().toISOString());
        formDataToSend.append('institutionId', formData.institutionId || user?.institutionId || '');

        // Simulate progress
        const progressInterval = setInterval(() => {
          setUploadProgress((prev) => {
            const newProgress = prev + (100 / files.length / 10);
            if (newProgress >= 90) {
              clearInterval(progressInterval);
              return 90;
            }
            return newProgress;
          });
        }, 100);

        const response = await certificateApi.upload(formDataToSend);
        
        clearInterval(progressInterval);
        setUploadProgress(100);

        return response;
      });

      const results = await Promise.all(uploadPromises);
      
      // Clean up file previews
      files.forEach((file) => {
        URL.revokeObjectURL(file.preview);
      });

      setFiles([]);
      setFormData({
        studentName: '',
        rollNumber: '',
        course: '',
        degree: '',
        issueDate: '',
        institutionId: '',
        grades: {},
      });

      onUploadComplete?.(results);
    } catch (error) {
      console.error('Upload error:', error);
      onUploadError?.(getErrorMessage(error));
    } finally {
      setIsUploading(false);
      setUploadProgress(0);
    }
  };

  return (
    <div className="max-w-4xl mx-auto">
      <form onSubmit={handleSubmit} className="space-y-6">
        {/* File Upload Area */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Upload Certificate Files
          </label>
          <div
            {...getRootProps()}
            className={`border-2 border-dashed rounded-lg p-8 text-center hover:border-gray-400 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 cursor-pointer transition-colors ${
              isDragActive ? 'border-blue-400 bg-blue-50' : 'border-gray-300'
            }`}
          >
            <input {...getInputProps()} />
            <CloudArrowUpIcon className="mx-auto h-12 w-12 text-gray-400" />
            <div className="mt-4">
              <p className="text-lg font-medium text-gray-900">
                {isDragActive ? 'Drop the files here' : 'Drag and drop your certificates here'}
              </p>
              <p className="mt-2 text-sm text-gray-500">
                or click to browse files
              </p>
              <p className="mt-1 text-xs text-gray-400">
                Supports PDF, JPG, PNG, TIFF (max 10MB each, up to 5 files)
              </p>
            </div>
          </div>

          {/* File List */}
          {files.length > 0 && (
            <div className="mt-4 space-y-2">
              {files.map((file) => (
                <div
                  key={file.id}
                  className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
                >
                  <div className="flex items-center space-x-3">
                    <DocumentIcon className="h-8 w-8 text-gray-400" />
                    <div>
                      <p className="text-sm font-medium text-gray-900">{file.name}</p>
                      <p className="text-xs text-gray-500">{formatFileSize(file.size)}</p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => removeFile(file.id)}
                    className="text-gray-400 hover:text-red-500"
                  >
                    <XMarkIcon className="h-5 w-5" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Form Fields */}
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
          <div>
            <label htmlFor="studentName" className="block text-sm font-medium text-gray-700">
              Student Name *
            </label>
            <input
              type="text"
              name="studentName"
              id="studentName"
              required
              value={formData.studentName}
              onChange={handleInputChange}
              className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
            />
          </div>

          <div>
            <label htmlFor="rollNumber" className="block text-sm font-medium text-gray-700">
              Roll Number *
            </label>
            <input
              type="text"
              name="rollNumber"
              id="rollNumber"
              required
              value={formData.rollNumber}
              onChange={handleInputChange}
              className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
            />
          </div>

          <div>
            <label htmlFor="course" className="block text-sm font-medium text-gray-700">
              Course *
            </label>
            <input
              type="text"
              name="course"
              id="course"
              required
              value={formData.course}
              onChange={handleInputChange}
              className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
            />
          </div>

          <div>
            <label htmlFor="degree" className="block text-sm font-medium text-gray-700">
              Degree *
            </label>
            <input
              type="text"
              name="degree"
              id="degree"
              required
              value={formData.degree}
              onChange={handleInputChange}
              className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
            />
          </div>

          <div>
            <label htmlFor="issueDate" className="block text-sm font-medium text-gray-700">
              Issue Date
            </label>
            <input
              type="date"
              name="issueDate"
              id="issueDate"
              value={formData.issueDate}
              onChange={handleInputChange}
              className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
            />
          </div>

          <div>
            <label htmlFor="institutionId" className="block text-sm font-medium text-gray-700">
              Institution
            </label>
            <input
              type="text"
              name="institutionId"
              id="institutionId"
              value={formData.institutionId}
              onChange={handleInputChange}
              placeholder={user?.institutionId || 'Institution ID'}
              className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
            />
          </div>
        </div>

        {/* Upload Progress */}
        {isUploading && (
          <div className="space-y-2">
            <div className="flex items-center justify-between text-sm text-gray-600">
              <span>Uploading...</span>
              <span>{Math.round(uploadProgress)}%</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div
                className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                style={{ width: `${uploadProgress}%` }}
              ></div>
            </div>
          </div>
        )}

        {/* Submit Button */}
        <div className="flex justify-end">
          <button
            type="submit"
            disabled={isUploading || files.length === 0}
            className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isUploading ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                Uploading...
              </>
            ) : (
              <>
                <CloudArrowUpIcon className="h-4 w-4 mr-2" />
                Upload Certificates
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  );
}