import * as React from 'react'
import { TextContent, Text, TextVariants } from '@patternfly/react-core'
import { CatalogItem } from '@openshift-console/dynamic-plugin-sdk'
import { ExtensionHook } from '../../types'
import { useK8sWatchResource } from '@openshift-console/dynamic-plugin-sdk'
import { CATALOG_TYPE, DBAAS_PROVIDER_KIND } from '../const'

const useDBaaSCatalog: ExtensionHook<CatalogItem[]> = ({ namespace }): [CatalogItem[], boolean, any] => {
  const [dbaasProviders, loaded, errorMsg] = useK8sWatchResource({
    kind: DBAAS_PROVIDER_KIND,
    isList: false,
  })

  const loadedOrError = loaded || errorMsg

  const providers = React.useMemo(() => {
    if (!loaded && !errorMsg) return []

    const providerCards: CatalogItem[] = (dbaasProviders as any).items?.map((provider) => {
      return {
        name: provider.spec?.provider?.displayName,
        type: CATALOG_TYPE,
        uid: provider.metadata?.uid,
        description: provider.spec?.provider?.displayDescription,
        provider: provider.spec?.provider?.name,
        tags: ['database'],
        icon: {
          url: `data:${provider.spec?.provider?.icon?.mediatype};base64,${provider.spec?.provider?.icon?.base64data}`,
        },
        cta: {
          label: 'Add to Topology',
          href: `/k8s/ns/${namespace}/oda-connection/${provider.metadata?.name}`,
        },
        details: {
          descriptions: [
            {
              value: (
                <TextContent>
                  <Text component={TextVariants.p}>{provider.spec?.provider?.displayDescription}</Text>
                </TextContent>
              ),
            },
          ],
        },
      }
    })

    return providerCards
  }, [loaded, errorMsg])

  return [providers, loadedOrError, undefined]
}

export default useDBaaSCatalog
