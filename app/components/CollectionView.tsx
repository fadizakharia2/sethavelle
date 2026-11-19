import { AnalyticsEvent, getSortByValue } from "@shopify/hydrogen";
import { CollectionProvider } from "@shopify/hydrogen/react";
import { useEffect, type ReactNode } from "react";
import { Link, useLocation, useNavigate, useNavigation, useSearchParams } from "react-router";

import {
  ActiveFilterChips,
  COLLECTION_SORT_OPTIONS,
  FacetForm,
  FilterDrawer,
  LoadMore,
  Toolbar,
  useLoadMore,
} from "~/components/CollectionBrowse";
import { ProductCard } from "~/components/ProductCard";
import type { loadCollectionPage } from "~/lib/collection";

export type CollectionPageData = Awaited<ReturnType<typeof loadCollectionPage>>;
type CollectionData = CollectionPageData["collection"];
type ProductNode = CollectionPageData["products"][number];

function CollectionViewedTracker({ collection }: { collection: CollectionData }) {
  useEffect(() => {
    window.Shopify?.analytics?.publish(AnalyticsEvent.COLLECTION_VIEWED, {
      collection: {
        id: collection.id,
        handle: collection.handle,
      },
    });
  }, [collection.id, collection.handle]);

  return null;
}

function ProductGrid({ products }: { products: readonly ProductNode[] }) {
  if (products.length === 0) return null;

  return (
    <div className="contain-paint">
      <ul
        id="product-grid"
        data-testid="product-grid"
        role="list"
        className="grid grid-cols-2 gap-x-4 gap-y-14 md:gap-x-8 lg:grid-cols-3"
      >
        {products.map((product, index) => (
          <li key={`${product.handle}-${index}`}>
            <ProductCard product={product} priority={index < 3} />
          </li>
        ))}
      </ul>
    </div>
  );
}

function EmptyState({ collectionPath }: { collectionPath: string }) {
  return (
    <div className="sv-panel sv-frame p-12 text-center">
      <h2 className="font-heading text-3xl text-[#e5d8c5]">Nothing answers that summons</h2>
      <p className="mt-3 text-sm text-[#a89d8e]">
        No fragrances match these filters. Loosen them to see more of the collection.
      </p>
      <Link to={collectionPath} preventScrollReset className="sv-button mt-8">
        Clear all filters
      </Link>
    </div>
  );
}

function CollectionResults({ loaderData, basePath }: { loaderData: CollectionPageData; basePath: string }) {
  const location = useLocation();
  const navigation = useNavigation();
  const isUpdating =
    navigation.state === "loading" &&
    navigation.location?.pathname === location.pathname &&
    navigation.location.search !== location.search;
  const collectionPath = basePath;
  const { nodes, pageInfo, isLoading, loadMore } = useLoadMore(
    loaderData.products,
    loaderData.pageInfo,
    loaderData.dataSearch,
  );
  const countText = `Showing ${nodes.length}`;
  const defaultSortValue = getSortByValue("COLLECTION_DEFAULT", false);

  return (
    <>
      <Toolbar
        countText={countText}
        sortOptions={COLLECTION_SORT_OPTIONS}
        defaultSortValue={defaultSortValue}
      />
      <ActiveFilterChips
        basePath={collectionPath}
        clearAllTo={collectionPath}
        currencyCode={loaderData.currencyCode}
      />
      <h2 className="sr-only">Products</h2>
      <div
        aria-busy={isUpdating}
        className={`motion-safe:transition-opacity motion-safe:duration-150 ${isUpdating ? "opacity-60" : "opacity-100"}`}
      >
        {nodes.length > 0 ? <ProductGrid products={nodes} /> : <EmptyState collectionPath={collectionPath} />}
      </div>
      <LoadMore
        pageInfo={pageInfo}
        loadedCount={nodes.length}
        countLabel={`Showing ${nodes.length} products`}
        isLoading={isLoading}
        onLoad={loadMore}
      />
      <FilterDrawer availableFilters={loaderData.availableFilters} currencyCode={loaderData.currencyCode} />
    </>
  );
}

export function CollectionView({
  loaderData,
  basePath,
  header,
}: {
  loaderData: CollectionPageData;
  basePath: string;
  header: ReactNode;
}) {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  return (
    <CollectionProvider
      data={{ handle: loaderData.collection.handle, dataSearch: loaderData.dataSearch }}
      urlSearch={searchParams.toString()}
      onChange={(search) => {
        const nextParams = new URLSearchParams(search.startsWith("?") ? search.slice(1) : search);
        nextParams.delete("after");
        const nextSearch = nextParams.toString();
        void navigate(
          { search: nextSearch ? `?${nextSearch}` : "" },
          {
            replace: searchParams.size > 0,
            preventScrollReset: true,
          },
        );
      }}
    >
      <CollectionViewedTracker collection={loaderData.collection} />
      <main className="flex-1" id="main-content" tabIndex={-1}>
        {header}
        <div className="max-w-page px-margin mx-auto w-full pb-24">
          <div className="lg:grid lg:grid-cols-[15rem_1fr] lg:gap-14">
            <aside className="hidden lg:block" aria-label="Filters">
              <div className="sticky top-[calc(var(--header-height)+2rem)]">
                <h2 className="sv-kicker mb-4">Refine</h2>
                <FacetForm
                  availableFilters={loaderData.availableFilters}
                  currencyCode={loaderData.currencyCode}
                />
              </div>
            </aside>
            <div>
              <CollectionResults loaderData={loaderData} basePath={basePath} />
            </div>
          </div>
        </div>
      </main>
    </CollectionProvider>
  );
}
