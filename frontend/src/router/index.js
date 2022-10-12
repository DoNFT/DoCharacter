import { createRouter, createWebHistory } from 'vue-router'
import Gallery from '../views/Gallery.vue'
import TokenDetail from '../views/TokenDetail.vue'
import Admin from '../views/Admin.vue'
import AppConnector from "@/crypto/AppConnector";
import {ConnectionStore} from "@/crypto/helpers";

const routes = [
  {
    path: '/',
    name: 'Characters',
    component: Gallery
  },
  {
    path: '/things',
    name: 'Things',
    component: Gallery
  },
  {
    path: '/colors',
    name: 'Colors',
    component: Gallery
  },
  {
    path: '/achievements',
    name: 'Achievements',
    component: Gallery
  },
  {
    path: '/asset/:contractAddress/:tokenID',
    name: 'TokenDetail',
    component: TokenDetail
  },
  {
    path: '/admin',
    name: 'Admin',
    component: Admin,
  },
]

const router = createRouter({
  history: createWebHistory(process.env.BASE_URL),
  routes
})

router.beforeEach(async (to, from) => {

  const notAdminRedirectObject = {
    name: 'Characters',
    query: {
      admin_role_required: true,
    }
  }

  if(to.meta.requiresAdmin){
    try{
      const {connector} = await AppConnector.init()
      await connector.isUserConnected()
      return ConnectionStore.isAdmin() && true || notAdminRedirectObject
    }
    catch (e) {
      return notAdminRedirectObject
    }
  }

  return true
})

export default router
