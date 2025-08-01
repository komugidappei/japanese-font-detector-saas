// 使用制限に関するモーダル
import { Fragment } from 'react';
import { Dialog, Transition } from '@headlessui/react';
import { XMarkIcon, ExclamationTriangleIcon } from '@heroicons/react/24/outline';
import { useAuth } from '../hooks/useAuth';
import Link from 'next/link';

const UsageLimitModal = ({ isOpen, onClose, usageInfo }) => {
  const { user } = useAuth();

  const renderContent = () => {
    if (!usageInfo) return null;

    const { user_type, reason } = usageInfo;

    if (user_type === 'anonymous') {
      if (reason === 'free_trial_used') {
        return (
          <div className="text-center">
            <ExclamationTriangleIcon className="mx-auto h-12 w-12 text-yellow-400 mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              無料体験は終了しました
            </h3>
            <p className="text-sm text-gray-500 mb-6">
              無料体験は3回までご利用いただけます。続けてご利用いただくには、アカウント登録とサブスクリプションが必要です。
            </p>
            <div className="space-y-3">
              <Link
                href="/auth/register"
                className="w-full inline-flex justify-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700"
              >
                アカウント登録して続ける
              </Link>
              <Link
                href="/pricing"
                className="w-full inline-flex justify-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
              >
                料金プランを見る
              </Link>
            </div>
          </div>
        );
      }
    } else if (user_type === 'authenticated') {
      if (reason === 'subscription_required') {
        return (
          <div className="text-center">
            <ExclamationTriangleIcon className="mx-auto h-12 w-12 text-yellow-400 mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              サブスクリプションが必要です
            </h3>
            <p className="text-sm text-gray-500 mb-6">
              このサービスを利用するには、有効なサブスクリプションが必要です。
            </p>
            <div className="space-y-3">
              <Link
                href="/subscription"
                className="w-full inline-flex justify-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700"
              >
                サブスクリプションを開始
              </Link>
              <Link
                href="/pricing"
                className="w-full inline-flex justify-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
              >
                料金プランを見る
              </Link>
            </div>
          </div>
        );
      }
    }

    // デフォルト
    return (
      <div className="text-center">
        <ExclamationTriangleIcon className="mx-auto h-12 w-12 text-red-400 mb-4" />
        <h3 className="text-lg font-medium text-gray-900 mb-2">
          利用制限に達しました
        </h3>
        <p className="text-sm text-gray-500 mb-6">
          このサービスを続けてご利用いただくには、サブスクリプションが必要です。
        </p>
        <div className="space-y-3">
          {!user ? (
            <Link
              href="/auth/register"
              className="w-full inline-flex justify-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700"
            >
              アカウント登録
            </Link>
          ) : (
            <Link
              href="/subscription"
              className="w-full inline-flex justify-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700"
            >
              サブスクリプション開始
            </Link>
          )}
          <Link
            href="/pricing"
            className="w-full inline-flex justify-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
          >
            料金プランを見る
          </Link>
        </div>
      </div>
    );
  };

  return (
    <Transition appear show={isOpen} as={Fragment}>
      <Dialog as="div" className="relative z-10" onClose={onClose}>
        <Transition.Child
          as={Fragment}
          enter="ease-out duration-300"
          enterFrom="opacity-0"
          enterTo="opacity-100"
          leave="ease-in duration-200"
          leaveFrom="opacity-100"
          leaveTo="opacity-0"
        >
          <div className="fixed inset-0 bg-black bg-opacity-25" />
        </Transition.Child>

        <div className="fixed inset-0 overflow-y-auto">
          <div className="flex min-h-full items-center justify-center p-4 text-center">
            <Transition.Child
              as={Fragment}
              enter="ease-out duration-300"
              enterFrom="opacity-0 scale-95"
              enterTo="opacity-100 scale-100"
              leave="ease-in duration-200"
              leaveFrom="opacity-100 scale-100"
              leaveTo="opacity-0 scale-95"
            >
              <Dialog.Panel className="w-full max-w-md transform overflow-hidden rounded-2xl bg-white p-6 text-left align-middle shadow-xl transition-all">
                <div className="absolute top-4 right-4">
                  <button
                    type="button"
                    className="text-gray-400 hover:text-gray-500"
                    onClick={onClose}
                  >
                    <XMarkIcon className="h-6 w-6" />
                  </button>
                </div>

                <div className="mt-2">
                  {renderContent()}
                </div>
              </Dialog.Panel>
            </Transition.Child>
          </div>
        </div>
      </Dialog>
    </Transition>
  );
};

export default UsageLimitModal;