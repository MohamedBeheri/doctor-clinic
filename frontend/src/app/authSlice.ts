import { createSlice, type PayloadAction } from '@reduxjs/toolkit'
import type { User } from '../types'

interface AuthState {
  access: string | null
  refresh: string | null
  user: User | null
}

const initialState: AuthState = {
  access: localStorage.getItem('access'),
  refresh: localStorage.getItem('refresh'),
  user: JSON.parse(localStorage.getItem('user') || 'null'),
}

const authSlice = createSlice({
  name: 'auth',
  initialState,
  reducers: {
    setCredentials(
      state,
      action: PayloadAction<{ access: string; refresh: string; user: User }>,
    ) {
      const { access, refresh, user } = action.payload
      state.access = access
      state.refresh = refresh
      state.user = user
      localStorage.setItem('access', access)
      localStorage.setItem('refresh', refresh)
      localStorage.setItem('user', JSON.stringify(user))
    },
    logout(state) {
      state.access = null
      state.refresh = null
      state.user = null
      localStorage.removeItem('access')
      localStorage.removeItem('refresh')
      localStorage.removeItem('user')
    },
  },
})

export const { setCredentials, logout } = authSlice.actions
export default authSlice.reducer
