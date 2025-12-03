"use client";

import type { Visit } from "generated/prisma";
import { SearchIcon } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "~/components/ui/card";
import { Combobox } from "~/components/ui/combobox";
import {
	InputGroup,
	InputGroupAddon,
	InputGroupInput,
} from "~/components/ui/input-group";
import { columnMap } from "~/lib/column-map";
import ViaControl from "./via-control";

export function FilterControls({
	search,
	via,
	searchScope,
	onSearch,
	onVia,
	onSearchScope,
}: {
	search: string;
	onSearch: (search: string) => void;
	via: "phone" | "inPerson" | "email" | "sms" | "all";
	onVia: (via: "phone" | "inPerson" | "email" | "sms" | "all") => void;
	searchScope: "all" | keyof Visit;
	onSearchScope: (searchScope: "all" | keyof Visit) => void;
}) {
	const comboboxOptions = [
		{ key: "all", label: "Tümü" },
		...Object.entries(columnMap.visit)
			.filter(
				([key]) =>
					key !== "via" &&
					key !== "createdAt" &&
					key !== "updatedAt" &&
					key !== "id" &&
					key !== "date" &&
					key !== "time",
			)
			.map(([key, label]) => {
				return { key, label };
			}),
	];

	return (
		<Card className="mb-4">
			<CardHeader className="flex flex-row items-center">
				<CardTitle className="mr-auto">Filtreler</CardTitle>
				<InputGroup className="ml-auto w-50">
					<InputGroupInput
						onChange={(e) => onSearch(e.target.value)}
						placeholder="Ara"
						type="search"
						value={search}
					/>
					<InputGroupAddon>
						<SearchIcon />
					</InputGroupAddon>
				</InputGroup>
				<Combobox
					label="Arama Kapsamı"
					onChange={(v) => onSearchScope(v as "all" | keyof Visit)}
					options={comboboxOptions}
					selectedKey={searchScope}
				/>
			</CardHeader>
			<CardContent>
				<ViaControl id="via" includeAll setVia={onVia} via={via} />
			</CardContent>
		</Card>
	);
}

