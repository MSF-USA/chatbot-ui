import NextAuth from "next-auth"
import GithubProvider from "next-auth/providers/github"


export const authOptions = {
  // Configure one or more authentication providers
  providers: [
    GithubProvider({
      clientId: '8776ae52da667c01d5f7',
      clientSecret: 'aa384e44db3b568b3b5a38700cfe2eac86779e0d',
    }),
    // ...add more providers here
  ],
}

export default NextAuth(authOptions)