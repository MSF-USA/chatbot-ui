import type { GetServerSidePropsContext, InferGetServerSidePropsType } from "next";
import { getProviders, signIn } from "next-auth/react"
import { getServerSession } from "next-auth/next"
import { authOptions } from "../api/auth/[...nextauth]";
import Image from 'next/image'
import azure from '../../public/azure.png'
import logo from '../../public/logo_light.png'

export default function SignIn({ providers }: InferGetServerSidePropsType<typeof getServerSideProps>) {
  return (
    <>
    <div class="flex flex-row py-10 px-10 bg-gray-800">
        <Image
                src={logo}
                alt="MSF Logo"
                height="50"
        />
        <h1 className="text-3xl font-bold text-white px-10">MSF AI Chat</h1>
    </div>
      {Object.values(providers).map((provider) => (
        <div class="flex flex-col items-center justify-center h-screen">
            <div class="mt-[-20vh] flex flex-row bg-gray-700 hover:bg-gray-600 text-white py-5 px-6 rounded focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-opacity-50">
                <Image
            src={azure}
            alt="Active Directory Logo"
            width="30"
            />
            <button
               class="px-5"
                onClick={() => signIn(provider.id)}
            >
                Sign in with {provider.name}
            </button>
            </div>
        </div>
      ))}
    </>
  )
}

export async function getServerSideProps(context: GetServerSidePropsContext) {
  const session = await getServerSession(context.req, context.res, authOptions);

  // If the user is already logged in, redirect.
  // Note: Make sure not to redirect to the same page
  // To avoid an infinite loop!
  if (session) {
    return { redirect: { destination: "/" } };
  }

  const providers = await getProviders();

  return {
    props: { providers: providers ?? [] },
  }
}