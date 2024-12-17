import { useAuth0 } from "@auth0/auth0-react";
import { useQuery } from "@tanstack/react-query";

export function useAuthenticatedFetch() {
  const { getAccessTokenSilently } = useAuth0();

  return async (url: string, options: RequestInit = {}) => {
    const token = await getAccessTokenSilently();
    
    const response = await fetch(url, {
      ...options,
      headers: {
        ...options.headers,
        Authorization: `Bearer ${token}`,
      },
    });

    if (!response.ok) {
      throw new Error('Network response was not ok');
    }

    return response.json();
  };
}
