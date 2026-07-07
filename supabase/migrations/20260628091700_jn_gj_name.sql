-- 통합 지자체 이름 확정: '전남광주통합특별시' (JN_GJ)
-- 이전 통합 마이그레이션 적용 여부와 무관하게 동작(upsert + 재통합).

insert into public.organizations (code, name, type)
values ('JN_GJ', '전남광주통합특별시', 'municipality')
on conflict (code) do update set name = excluded.name;

-- 전라남도/광주광역시가 남아 있으면 화장실 이관 후 삭제
update public.locations set org_id = (select id from public.organizations where code = 'JN_GJ')
where org_id in (select id from public.organizations where code in ('JEONNAM','GWANGJU'));

delete from public.organizations where code in ('JEONNAM','GWANGJU');
