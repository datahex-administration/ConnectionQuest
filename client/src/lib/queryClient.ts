import { QueryClient, QueryFunction } from "@tanstack/react-query";

async function throwIfResNotOk(res: Response) {
  if (!res.ok) {
    const text = (await res.text()) || res.statusText;
    throw new Error(`${res.status}: ${text}`);
  }
}

export async function apiRequest(
  method: string,
  url: string,
  data?: unknown | undefined,
): Promise<Response> {
  // Get auth token from localStorage if available
  const authToken = localStorage.getItem('mawadha_auth_token');
  
  // Set up headers with auth token if available
  const headers: Record<string, string> = {};
  if (data) headers["Content-Type"] = "application/json";
  if (authToken) headers["x-user-token"] = authToken;
  
  let res = await fetch(url, {
    method,
    headers,
    body: data ? JSON.stringify(data) : undefined,
    credentials: "include",
  });

  // Handle 401 errors by trying to refresh the user session
  if (res.status === 401 && url !== '/api/user') {
    // Attempt to refresh session by fetching user data
    try {
      const userRes = await fetch('/api/user', {
        method: 'GET',
        headers: { ...headers },
        credentials: "include"
      });
      
      // If user data is successfully refreshed, retry the original request
      if (userRes.ok) {
        const userData = await userRes.json();
        // If the response includes a token, update localStorage
        if (userData && userData.token) {
          localStorage.setItem('mawadha_auth_token', userData.token);
          // Update headers with the new token
          headers["x-user-token"] = userData.token;
        }
        
        // Retry the original request with updated auth token
        res = await fetch(url, {
          method,
          headers,
          body: data ? JSON.stringify(data) : undefined,
          credentials: "include",
        });
      }
    } catch (e) {
      console.log('Failed to refresh session:', e);
    }
  }

  await throwIfResNotOk(res);
  return res;
}

type UnauthorizedBehavior = "returnNull" | "throw";
export const getQueryFn: <T>(options: {
  on401: UnauthorizedBehavior;
}) => QueryFunction<T> =
  ({ on401: unauthorizedBehavior }) =>
  async ({ queryKey }) => {
    try {
      // Use our enhanced apiRequest function for consistent auth handling
      const res = await apiRequest("GET", queryKey[0] as string);
      return await res.json();
    } catch (error) {
      // Handle 401 errors according to the specified behavior
      if (
        error instanceof Error && 
        error.message.includes("401") && 
        unauthorizedBehavior === "returnNull"
      ) {
        return null;
      }
      throw error;
    }
  };

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      queryFn: getQueryFn({ on401: "throw" }),
      refetchInterval: false,
      refetchOnWindowFocus: false,
      staleTime: Infinity,
      retry: false,
    },
    mutations: {
      retry: false,
    },
  },
});
