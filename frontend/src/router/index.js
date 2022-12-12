import { createRouter, createWebHistory } from 'vue-router'
import Gallery from '../views/Gallery.vue'
import Login from '../views/Login.vue'
import TokenDetail from '../views/TokenDetail.vue'
import Admin from '../views/Admin.vue'
import AppConnector from "@/crypto/AppConnector";

const routes = [
  {
    path: '/',
    name: 'Characters',
    component: Gallery,
    meta: {
      requiresAuth: true
    },
  },
  {
    path: '/things',
    name: 'Things',
    component: Gallery,
    meta: {
      requiresAuth: true
    },
  },
  {
    path: '/colors',
    name: 'Colors',
    component: Gallery,
    meta: {
      requiresAuth: true
    },
  },
  {
    path: '/achievements',
    name: 'Achievements',
    component: Gallery,
    meta: {
      requiresAuth: true
    },
  },
  {
    path: '/asset/:contractAddress/:tokenID',
    name: 'TokenDetail',
    component: TokenDetail,
    meta: {
      requiresAuth: true
    },
  },
  {
    path: '/admin',
    name: 'Admin',
    component: Admin,
    meta: {
      requiresAuth: true
    },
  },
  {
    path: '/login',
    name: 'Login',
    component: Login,
    meta: {

    },
  },
]

const router = createRouter({
  history: createWebHistory(process.env.BASE_URL),
  routes
})

router.beforeEach(async (to, from) => {

  const notAuthRedirectObject = {
    name: 'Login',
    query: {
      auth_required: true,
    }
  }

  if(to.meta.requiresAuth){
    try{
      const {connector} = await AppConnector.init()
      return await connector.isUserConnected() && true || notAuthRedirectObject
    }
    catch (e) {
      return notAuthRedirectObject
    }
  }

  return true
})

export default router
