// /src/components/admin/TestAnyUserModal.tsx

import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { FlaskConical, Search, User, X } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { startTestMode, mapUserTypeToRole, getRealAdminUser } from '../../lib/auth';
import { Button } from '../shared/Button';
import { toast } from '../shared/Toast';

interface TestAnyUserModalProps {
  isOpen: boolean;
  onClose: () => void;
}

interface UserData {
  id: string;
  name: string;
  email: string;
  user_type?: string;
  type?: string;
  created_at: string;
}

export function TestAnyUserModal({ isOpen, onClose }: TestAnyUserModalProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedUserType, setSelectedUserType] = useState<string>('all');
  
  const realAdmin = getRealAdminUser();
  const isSSA = realAdmin?.role === 'SSA';

  if (!isSSA) {
    return null;
  }

  // Fetch all users based on selected type
  const { data: allUsers = [], isLoading } = useQuery(
    ['all-users-test-mode', searchTerm, selectedUserType],
    async () => {
      const users: UserData[] = [];
      const processedEmails = new Set<string>(); // To track and avoid duplicates
      
      // Fetch admin users (these have a name column)
      if (selectedUserType === 'all' || selectedUserType === 'admin') {
        const { data: adminUsers, error: adminError } = await supabase
          .from('admin_users')
          .select('id, name, email, created_at, roles(name)')
          .limit(50);
        
        if (!adminError && adminUsers) {
          adminUsers.forEach(admin => {
            if (!processedEmails.has(admin.email)) {
              processedEmails.add(admin.email);
              users.push({
                id: admin.id,
                name: admin.name,
                email: admin.email,
                user_type: 'admin',
                type: admin.roles?.name || 'Admin',
                created_at: admin.created_at
              });
            }
          });
        }
      }
      
      // Fetch teachers
      if (selectedUserType === 'all' || selectedUserType === 'teacher') {
        const { data: teachers, error: teacherError } = await supabase
          .from('teachers')
          .select(`
            user_id,
            teacher_code,
            users!inner(
              id,
              email,
              created_at,
              raw_user_meta_data
            )
          `)
          .limit(50);
        
        if (!teacherError && teachers) {
          teachers.forEach(teacher => {
            if (teacher.users && !processedEmails.has(teacher.users.email)) {
              processedEmails.add(teacher.users.email);
              
              // Try to get name from metadata or use teacher code
              let teacherName = teacher.users.email.split('@')[0];
              if (teacher.users.raw_user_meta_data?.name) {
                teacherName = teacher.users.raw_user_meta_data.name;
              } else if (teacher.users.raw_user_meta_data?.full_name) {
                teacherName = teacher.users.raw_user_meta_data.full_name;
              } else if (teacher.teacher_code) {
                teacherName = `Teacher ${teacher.teacher_code}`;
              }
              
              users.push({
                id: teacher.users.id,
                name: teacherName,
                email: teacher.users.email,
                user_type: 'teacher',
                type: 'Teacher',
                created_at: teacher.users.created_at
              });
            }
          });
        }
      }
      
      // Fetch students
      if (selectedUserType === 'all' || selectedUserType === 'student') {
        const { data: students, error: studentError } = await supabase
          .from('students')
          .select(`
            user_id,
            student_code,
            parent_name,
            users!inner(
              id,
              email,
              created_at,
              raw_user_meta_data
            )
          `)
          .limit(50);
        
        if (!studentError && students) {
          students.forEach(student => {
            if (student.users && !processedEmails.has(student.users.email)) {
              processedEmails.add(student.users.email);
              
              // Try to get name from metadata or use student code
              let studentName = student.users.email.split('@')[0];
              if (student.users.raw_user_meta_data?.name) {
                studentName = student.users.raw_user_meta_data.name;
              } else if (student.users.raw_user_meta_data?.full_name) {
                studentName = student.users.raw_user_meta_data.full_name;
              } else if (student.student_code) {
                studentName = `Student ${student.student_code}`;
              }
              
              // Add parent info if available
              if (student.parent_name) {
                studentName += ` (Parent: ${student.parent_name})`;
              }
              
              users.push({
                id: student.users.id,
                name: studentName,
                email: student.users.email,
                user_type: 'student',
                type: 'Student',
                created_at: student.users.created_at
              });
            }
          });
        }
      }
      
      // Fetch entity users - FIXED: Specify the foreign key to use
      if (selectedUserType === 'all' || selectedUserType === 'entity') {
        const { data: entityUsers, error: entityError } = await supabase
          .from('entity_users')
          .select(`
            user_id,
            position,
            department,
            employee_id,
            users!entity_users_user_id_fkey(
              id,
              email,
              created_at,
              raw_user_meta_data
            ),
            companies!entity_users_company_id_fkey(
              name
            )
          `)
          .limit(50);
        
        if (!entityError && entityUsers) {
          entityUsers.forEach(entity => {
            if (entity.users && !processedEmails.has(entity.users.email)) {
              processedEmails.add(entity.users.email);
              
              // Try to get name from metadata or use employee ID
              let entityName = entity.users.email.split('@')[0];
              if (entity.users.raw_user_meta_data?.name) {
                entityName = entity.users.raw_user_meta_data.name;
              } else if (entity.users.raw_user_meta_data?.full_name) {
                entityName = entity.users.raw_user_meta_data.full_name;
              } else if (entity.employee_id) {
                entityName = `Employee ${entity.employee_id}`;
              }
              
              // Add position/company if available
              if (entity.position) {
                entityName += ` (${entity.position})`;
              }
              
              users.push({
                id: entity.users.id,
                name: entityName,
                email: entity.users.email,
                user_type: 'entity',
                type: entity.companies?.name || 'Entity User',
                created_at: entity.users.created_at
              });
            }
          });
        }
      }
      
      // Filter by search term if needed (search in both name and email)
      let filteredUsers = users;
      if (searchTerm) {
        filteredUsers = users.filter(user => 
          user.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
          user.email?.toLowerCase().includes(searchTerm.toLowerCase())
        );
      }
      
      // Sort by creation date (newest first)
      return filteredUsers.sort((a, b) => 
        new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      );
    },
    { 
      enabled: isOpen,
      keepPreviousData: true 
    }
  );

  const handleTestAsUser = async (user: UserData) => {
    try {
      let userRole = 'VIEWER';
      
      // Map user type to role
      if (user.user_type === 'admin') {
        // For admin users, the type contains the role name
        if (user.type?.includes('Super Admin')) {
          userRole = 'SSA';
        } else if (user.type?.includes('Support')) {
          userRole = 'SUPPORT';
        } else {
          userRole = 'VIEWER';
        }
      } else if (user.user_type === 'teacher') {
        userRole = 'TEACHER';
      } else if (user.user_type === 'student') {
        userRole = 'STUDENT';
      } else if (user.user_type === 'entity') {
        userRole = 'ENTITY_ADMIN';
      }
      
      const testUser = {
        id: user.id,
        name: user.name || user.email,
        email: user.email,
        role: userRole as any,
        userType: user.user_type
      };
      
      startTestMode(testUser);
      toast.success(`Starting test mode as ${testUser.name}`);
      onClose();
    } catch (error) {
      console.error('Error starting test mode:', error);
      toast.error('Failed to start test mode');
    }
  };

  const getUserTypeColor = (type: string) => {
    const colors: Record<string, string> = {
      admin: 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300',
      teacher: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300',
      student: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300',
      entity: 'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-300',
    };
    
    return colors[type?.toLowerCase()] || 'bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-300';
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl w-full max-w-3xl max-h-[80vh] flex flex-col">
        {/* Header */}
        <div className="px-6 py-4 border-b dark:border-gray-700 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <FlaskConical className="h-5 w-5 text-orange-500" />
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Test as Any User</h2>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Filters */}
        <div className="px-6 py-4 border-b dark:border-gray-700 space-y-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search by name or email..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          
          <div className="flex gap-2 flex-wrap">
            {['all', 'admin', 'teacher', 'student', 'entity'].map(type => (
              <button
                key={type}
                onClick={() => setSelectedUserType(type)}
                className={`px-3 py-1 rounded-md text-sm font-medium transition-colors ${
                  selectedUserType === type
                    ? 'bg-orange-500 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200 dark:bg-gray-700 dark:text-gray-300 dark:hover:bg-gray-600'
                }`}
              >
                {type === 'all' ? 'All Users' : 
                 type === 'entity' ? 'Entity Users' :
                 type.charAt(0).toUpperCase() + type.slice(1) + 's'}
              </button>
            ))}
          </div>
        </div>

        {/* User List */}
        <div className="flex-1 overflow-y-auto px-6 py-4">
          {isLoading ? (
            <div className="text-center py-8 text-gray-500">Loading users...</div>
          ) : allUsers.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              No users found
              {searchTerm && <p className="text-sm mt-2">Try adjusting your search term</p>}
            </div>
          ) : (
            <div className="grid gap-2">
              {allUsers.map((user) => (
                <div
                  key={`${user.user_type}-${user.id}`}
                  className="flex items-center justify-between p-3 rounded-lg border dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-full bg-gray-200 dark:bg-gray-600 flex items-center justify-center">
                      <User className="h-5 w-5 text-gray-600 dark:text-gray-300" />
                    </div>
                    <div className="flex-1">
                      <div className="font-medium text-gray-900 dark:text-white">{user.name}</div>
                      <div className="text-sm text-gray-500 dark:text-gray-400">{user.email}</div>
                    </div>
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${getUserTypeColor(user.user_type || '')}`}>
                      {user.type || user.user_type || 'Unknown'}
                    </span>
                  </div>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleTestAsUser(user)}
                    leftIcon={<FlaskConical className="h-3 w-3" />}
                  >
                    Test
                  </Button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t dark:border-gray-700 bg-gray-50 dark:bg-gray-900/50">
          <p className="text-xs text-gray-500 dark:text-gray-400">
            ⚠️ Test mode allows you to view the system with the selected user's permissions. 
            You'll be redirected to their default module dashboard.
          </p>
        </div>
      </div>
    </div>
  );
}