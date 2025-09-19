@@ .. @@
 import { TestModeBar } from './components/admin/TestModeBar';
 import { isInTestMode, getCurrentUser } from './lib/auth';
 import SystemAdminPage from './app/system-admin/page';
 import SignInPage from './app/signin/page';
 import ForgotPasswordPage from './app/forgot-password/page';
 import ResetPasswordPage from './app/reset-password/page';
 import LandingPage from './app/landing/page';
 import SubjectsPage from './app/landing/subjects';
 import ResourcesPage from './app/landing/resources';
 import AboutPage from './app/landing/about';
 import ContactPage from './app/landing/contact';
 import EntityModulePage from './app/entity-module/page';
 import StudentModulePage from './app/student-module/page';
 import TeachersModulePage from './app/teachers-module/page';
 import FormValidationPage from './pages/FormValidationPage';

             <Routes>
               <Route path="/" element={<LandingPage />} />
              <Route path="/landing/subjects" element={<SubjectsPage />} />
              <Route path="/landing/resources" element={<ResourcesPage />} />
              <Route path="/landing/about" element={<AboutPage />} />
              <Route path="/landing/contact" element={<ContactPage />} />
               <Route path="/signin" element={<SignInPage />} />
               <Route path="/forgot-password" element={<ForgotPasswordPage />} />
               <Route path="/reset-password" element={<ResetPasswordPage />} />
               <Route path="/form-validation" element={<FormValidationPage />} />